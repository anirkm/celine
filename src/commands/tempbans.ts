import {
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Message,
  PermissionFlagsBits,
} from "discord.js";
import { CollectorUtils } from "discord.js-collector-utils";
import ms from "enhanced-ms";
import emoji from "../data/emojies.json";
import { hasPermission, sendPagination } from "../functions";
import { Command } from "../types";
import { RtextEmbed, textEmbed } from "../utils/msgUtils";
const command: Command = {
  name: "tempbans",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_ban")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let cursor = "0";
    let bans: any[] = [];

    if (args[1] == "clear") {
      let cursor = "0";
      let banKeys: string[] = [];
      let success = 0;

      do {
        const [nextCursor, keys] = await client.redis.scan(
          cursor,
          "MATCH",
          `banqueue_${message.guild?.id}_*`
        );
        cursor = nextCursor;
        for await (const key of keys) {
          console.log(key);
          banKeys.push(key);
        }
      } while (cursor !== "0");

      if (!banKeys || banKeys.length === 0)
        return textEmbed(
          message,
          `${emoji.error} | There are no users to unban.`
        );
      let collectorPrompt = await message.reply({
        embeds: [
          await RtextEmbed(
            `${emoji.question} |  Are you sure you want to cancel ${banKeys.length} tempbans, this action is irreversible! (reply within 30 seconds)`
          ),
        ],
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                customId: "acceptUnbanAll",
                emoji: `${emoji.approve}`,
                style: ButtonStyle.Success,
              },
              {
                type: ComponentType.Button,
                customId: "cancelUnbanAll",
                emoji: `${emoji.decline}`,
                style: ButtonStyle.Danger,
              },
            ],
          },
        ],
      });

      if (banKeys && banKeys.length !== 0) {
        let collectorResult = await CollectorUtils.collectByButton(
          collectorPrompt,
          async (buttonInteraction: ButtonInteraction) => {
            switch (buttonInteraction.customId) {
              case "acceptUnbanAll":
                return { intr: buttonInteraction, value: "acceptUnbanAll" };
              case "cancelUnbanAll":
                return { intr: buttonInteraction, value: "cancelUnbanAll" };
              default:
                return;
            }
          },
          {
            time: 30 * 1000,
            reset: false,
            target: message.member?.user,
            stopFilter: (message: Message) =>
              message.content.toLowerCase() === "stop",
            onExpire: async () => {
              collectorPrompt.edit({
                embeds: [
                  await RtextEmbed(
                    `${emoji.decline} | Time out! Try being more decisive next time.`
                  ),
                ],
                components: [],
              });
            },
          }
        );

        if (collectorResult) {
          switch (collectorResult.value) {
            case "acceptUnbanAll":
              collectorPrompt.edit({
                embeds: [
                  await RtextEmbed(
                    `${emoji.loading} | Wait a moment while I unban all users...`
                  ),
                ],
                components: [],
              });

              for await (const key of banKeys) {
                const user = await client.users.fetch(key.split("_")[2]);
                if (user) {
                  await message.guild?.members
                    .unban(user, "tempban clear")
                    .then(() => {
                      success++;
                    })
                    .catch(() => {});
                }
              }
              await client.redis.del(banKeys).catch((e) => {
                console.log("tempban all clear error redis", e);
              });

              collectorPrompt.edit({
                embeds: [
                  await RtextEmbed(
                    `${emoji.approve} | ${success} users were successfully unbanned.`
                  ),
                ],
                components: [],
              });

              break;
            case "cancelUnbanAll":
              collectorPrompt.edit({
                embeds: [
                  await RtextEmbed(
                    `${emoji.decline} | **Action cancelled**, no users were unbanned.`
                  ),
                ],
                components: [],
              });
              break;
            default:
              break;
          }
        }
      }

      return;
    }

    let user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], cache: true })
        .catch(() => {}));

    let msg = await textEmbed(
      message,
      `${emoji.loading} | Fetching active tempbans..`
    );

    do {
      const [nextCursor, keys] = await client.redis.scan(
        cursor,
        "MATCH",
        `banqueue_${message.guild?.id}_${user?.id || "*"}`
      );
      cursor = nextCursor;
      for await (const key of keys) {
        let bandUser = await client.users
          .fetch(key.split("_")[2])
          .catch(() => {});
        let expireTime = (await client.redis.get(key)) || 0;
        console.log(key);

        if (bandUser && Number(expireTime) > 0) {
          bans.push({ member: bandUser, expireTime: expireTime });
        }
      }
    } while (cursor !== "0");

    if (!bans || bans.length <= 0)
      return msg.edit({
        embeds: [
          await RtextEmbed(`${emoji.error} | **No tempbans were found**.`),
        ],
      });

    console.log(bans.length);

    let dataPerPage = 7;
    let totalEmbeds = Math.ceil(bans.length / dataPerPage);

    let i = 0;
    let embeds: EmbedBuilder[] = [];

    for (let j = 0; j < totalEmbeds; j++) {
      let desc: string[] = [
        `${emoji.pepoban} | There is ${bans.length} active bans\n`,
      ];

      let embed = new EmbedBuilder()
        .setAuthor({
          name: `${message.guild?.name || "Unknown"} Bans`,
          iconURL:
            message.guild?.iconURL({ size: 4096 }) ||
            "https://cdn.discordapp.com/embed/avatars/5.png",
        })
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL:
            message.author.displayAvatarURL({ size: 4096 }) ||
            "https://cdn.discordapp.com/embed/avatars/5.png",
        });

      for (let k = 0; k < dataPerPage; k++) {
        if (bans[i + k]) {
          desc.push(
            [
              `<@${bans[i + k].member.id}> (${bans[i + k].member.id})`,
              `**Expires in:** ${ms(
                Number(bans[i + k].expireTime) - new Date().getTime()
              )} \n`,
            ]
              .filter((v) => v != "")
              .join("\n")
          );
        }

        embed.setDescription(desc.filter((v) => v != "").join("\n"));
      }

      embeds.push(embed);
      i += dataPerPage;
    }
    msg
      .delete()
      .then(async () => {
        await sendPagination(message, embeds);
      })
      .catch(async () => {
        await sendPagination(message, embeds);
      });
  },
  cooldown: 10,
  aliases: [],
  permissions: [],
};

export default command;
