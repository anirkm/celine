import {
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  Message,
  PermissionFlagsBits,
} from "discord.js";
import { CollectorUtils } from "discord.js-collector-utils";
import emoji from "../data/emojies.json";
import GuildModel from "../schemas/Guild";
import { Command } from "../types";
import { missingArgs, RtextEmbed, textEmbed } from "../utils/msgUtils";
import { hasPermission } from "../functions";

const command: Command = {
  name: "unmute",
  execute: async (client, message, args) => {

    if (
      !(await hasPermission(client, message.member!, "use_mute")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(message, "unmute", `${message.member}`, [
      `${message.member}`,
    ]);
    if (!args[1]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    const guild = await GuildModel.findOne({ guildID: message.guild?.id });

    if (!guild)
      return textEmbed(
        message,
        `${emoji.error} | This guild isn't correctly setup. run __&cfg sg__.`
      );

    if (guild && !guild.options.muteRole)
      return textEmbed(
        message,
        `${emoji.error} | Muted role for this guild isn't correctly setup. run __&cfg muterole__.`
      );
    const muteRole = await message.guild?.roles.fetch(guild.options.muteRole);

    if (!muteRole)
      return textEmbed(
        message,
        `${emoji.error} | Muted role for this guild is invalid setup. run __&cfg muterole__.`
      );

    if (args[1] === "all") {
      let cursor = "0";
      let muteKeys: string[] = [];
      let success = 0;

      do {
        const [nextCursor, keys] = await client.redis.scan(
          cursor,
          "MATCH",
          `mutequeue_${message.guild?.id}_*`
        );
        cursor = nextCursor;
        for await (const key of keys) {
          console.log(key);
          muteKeys.push(key);
        }
      } while (cursor !== "0");

      if (!muteKeys || muteKeys.length === 0)
        return textEmbed(
          message,
          `${emoji.error} | There are no users to unmute.`
        );

      let collectorPrompt = await message.reply({
        embeds: [
          await RtextEmbed(
            `${emoji.question} |  Are you sure you want to clear ${muteKeys.length} mutes, this action is irreversible! (reply within 30 seconds)`
          ),
        ],
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                customId: "acceptMuteAll",
                emoji: `${emoji.approve}`,
                style: ButtonStyle.Success,
              },
              {
                type: ComponentType.Button,
                customId: "cancelUnmuteAll",
                emoji: `${emoji.decline}`,
                style: ButtonStyle.Danger,
              },
            ],
          },
        ],
      });

      if (muteKeys && muteKeys.length !== 0) {
        let collectorResult = await CollectorUtils.collectByButton(
          collectorPrompt,
          async (buttonInteraction: ButtonInteraction) => {
            switch (buttonInteraction.customId) {
              case "acceptMuteAll":
                return { intr: buttonInteraction, value: "acceptMuteAll" };
              case "cancelUnmuteAll":
                return { intr: buttonInteraction, value: "cancelUnmuteAll" };
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
            case "acceptMuteAll":
              collectorPrompt.edit({
                embeds: [
                  await RtextEmbed(
                    `${emoji.loading} | Wait a moment while I unmute all users...`
                  ),
                ],
                components: [],
              });

              for await (const key of muteKeys) {
                const user = await message.guild?.members.fetch(
                  key.split("_")[2]
                );
                if (user) {
                  await user.roles
                    .remove(
                      muteRole,
                      `Unmute all by ${message.member?.user.tag}`
                    )
                    .then(() => {
                      success++;
                    })
                    .catch(() => {});
                }
              }
              await client.redis.del(muteKeys).catch((e) => {
                console.log("unmute all clear error redis", e);
              });

              collectorPrompt.edit({
                embeds: [
                  await RtextEmbed(
                    `${emoji.approve} | ${success} users were successfully unmuted.`
                  ),
                ],
                components: [],
              });

              break;
            case "cancelUnmuteAll":
              collectorPrompt.edit({
                embeds: [
                  await RtextEmbed(
                    `${emoji.decline} | **Action cancelled**, no users were unmuted.`
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

    const user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], cache: true })
        .catch(() => {}));

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you specified was not found.`
      );

    user.roles
      .remove(muteRole, `User unmuted by ${message.member?.user.tag}`)
      .then(async (user) => {
        await client.redis
          .keys(`mutequeue_${message.guild?.id}_${user.id}`)
          .then((keys) => {
            if (keys.length !== 0) {
              client.redis.del(keys).catch((e) => {
                console.log("unmute mute clear error redis", e);
              });
            }
          });

        message.reply(`**${emoji.yay} | ${user} unmuted.**`);

        return await user
          .send({
            embeds: [
              await RtextEmbed(
                `${emoji.yay} | You've been unmuted in **${
                  message.guild?.name || "Failed to fetch guild name"
                }**`
              ),
            ],
          })
          .catch(() => {});
      })
      .catch((e) => {
        switch (e.message) {
          case "Unknown User":
            textEmbed(message, `${emoji.error} | Invalid user, Try again.`);
            break;
          case "Missing Permissions":
            textEmbed(
              message,
              `${emoji.error} | Due to missing permissions i can't execute this command on ${user}.`
            );
            break;
          case "Invalid Form Body":
            textEmbed(
              message,
              `${emoji.error} | You've malformed the command, try again.`
            );
            break;
          default:
            textEmbed(
              message,
              `${emoji.error} | An error occurred while trying to execute this command, try again.. (DiscordAPI: ${e.message})`
            );
            console.log(e);
            break;
        }
      });
  },
  cooldown: 10,
  aliases: [],
  permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
