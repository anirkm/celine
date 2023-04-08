import {
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  GuildMember,
  Message,
  PermissionFlagsBits,
  Role,
} from "discord.js";
import { CollectorUtils } from "discord.js-collector-utils";
import ms from "enhanced-ms";
import emoji from "../data/emojies.json";
import { hasPermission, sendPagination } from "../functions";
import { Command } from "../types";
import { RtextEmbed, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "temproles",

  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_temprole")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;
    let cursor = "0";
    let temproles: any[] = [];

    if (args[1] == "clear") {
      let cursor = "0";
      let trKeys: string[] = [];
      let success = 0;
      let failed = 0;

      do {
        const [nextCursor, keys] = await client.redis.scan(
          cursor,
          "MATCH",
          `tr_${message.guild?.id}_*`
        );
        cursor = nextCursor;
        for await (const key of keys) {
          trKeys.push(key);
        }
      } while (cursor !== "0");

      if (!trKeys || trKeys.length === 0)
        return textEmbed(
          message,
          `${emoji.error} | There are no users with temporary roles with your query.`
        );
      let collectorPrompt = await message.reply({
        embeds: [
          await RtextEmbed(
            `${emoji.question} |  Are you sure you want to cancel ${trKeys.length} temporary roles, this action is irreversible and will remove the roles from the users! (reply within 30 seconds)`
          ),
        ],
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                customId: "acceptCancelTrAll",
                emoji: `${emoji.approve}`,
                style: ButtonStyle.Success,
              },
              {
                type: ComponentType.Button,
                customId: "cancelCancelTrAll",
                emoji: `${emoji.decline}`,
                style: ButtonStyle.Danger,
              },
            ],
          },
        ],
      });

      if (trKeys && trKeys.length !== 0) {
        let collectorResult = await CollectorUtils.collectByButton(
          collectorPrompt,
          async (buttonInteraction: ButtonInteraction) => {
            switch (buttonInteraction.customId) {
              case "acceptCancelTrAll":
                return { intr: buttonInteraction, value: "acceptCancelTrAll" };
              case "cancelCancelTrAll":
                return { intr: buttonInteraction, value: "cancelCancelTrAll" };
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
            case "acceptCancelTrAll":
              collectorPrompt.edit({
                embeds: [
                  await RtextEmbed(
                    `${emoji.loading} | Wait a moment while I remove the roles from users...`
                  ),
                ],
                components: [],
              });

              for await (const key of trKeys) {
                const user = await message.guild?.members.fetch(
                  key.split("_")[2]
                );
                const role = await message.guild?.roles
                  .fetch(key.split("_")[3])
                  .catch(() => {});

                if (!user || !role) continue;

                await user.roles
                  .remove(role, "temproles clear")
                  .then(() => {
                    success++;
                  })
                  .catch(() => {
                    failed++;
                  });
              }
              await client.redis.del(trKeys).catch((e) => {
                console.log("temproles all clear error redis", e);
              });

              collectorPrompt.edit({
                embeds: [
                  await RtextEmbed(
                    `${emoji.approve} | ${success} temporary roles were successfully canceled, while have ${failed} failed.`
                  ),
                ],
                components: [],
              });

              break;
            case "cancelCancelTrAll":
              collectorPrompt.edit({
                embeds: [
                  await RtextEmbed(
                    `${emoji.decline} | **Action cancelled**, no temporary roles were canceled.`
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

    let arg =
      message.mentions.members?.first() ||
      message.mentions.roles?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], cache: true })
        .catch(() => {})) ||
      (await message.guild?.roles.fetch(args[1]).catch(() => {}));

    let msg = await textEmbed(
      message,
      `${emoji.loading} | Fetching active temporary roles..`
    );

    do {
      const [nextCursor, keys] = await client.redis.scan(
        cursor,
        "MATCH",
        `tr_${message.guild?.id}_${arg instanceof GuildMember ? arg.id : "*"}_${
          arg instanceof Role ? arg.id : "*"
        }`
      );
      cursor = nextCursor;
      for await (const key of keys) {
        const trUser = await message.guild?.members
          .fetch(key.split("_")[2])
          .catch(() => {});
        const expireTime = (await client.redis.get(key)) || 0;
        const role = await message.guild?.roles
          .fetch(key.split("_")[3])
          .catch(() => {});

        if (!role || !trUser) {
          await client.redis.del(key).catch();
          continue;
        }

        if (trUser && Number(expireTime) > 0 && role) {
          console.log({
            member: trUser.id,
            expireTime: expireTime,
            role: role.id,
          });

          temproles.push({
            member: trUser,
            expireTime: expireTime,
            role: role,
          });
        }
      }
    } while (cursor !== "0");

    if (!temproles || temproles.length <= 0)
      return msg.edit({
        embeds: [
          await RtextEmbed(
            `${emoji.error} | **No temporary roles were found with your query**.`
          ),
        ],
      });

    console.log(temproles.length);

    let dataPerPage = 7;
    let totalEmbeds = Math.ceil(temproles.length / dataPerPage);

    let i = 0;
    let embeds: EmbedBuilder[] = [];

    for (let j = 0; j < totalEmbeds; j++) {
      let desc: string[] = [
        `<:searchbae:1085255657420238888> | **${
          arg instanceof GuildMember ? `${arg} got` : "There is"
        } ${temproles.length} active temporary roles ${
          arg instanceof Role ? `of ${arg}` : ""
        }\n**`,
      ];

      let embed = new EmbedBuilder()
        .setAuthor({
          name: `${message.guild?.name || "Unknown"} temporary roles`,
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
        if (temproles[i + k]) {
          desc.push(
            [
              `**User**: <@${temproles[i + k].member.id}> (${
                temproles[i + k].member.id
              })`,
              `**Role:** ${temproles[i + k].role} (${
                temproles[i + k].role.id
              })`,
              `**Expires in:** ${ms(
                Number(temproles[i + k].expireTime) - new Date().getTime()
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
  aliases: ["trs"],
  permissions: [],
};

export default command;
