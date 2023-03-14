import {
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  Message,
  PermissionFlagsBits,
} from "discord.js";
import { CollectorUtils } from "discord.js-collector-utils";
import emoji from "../data/emojies.json";
import { hasPermission, sendPagination } from "../functions";
import WarnModel from "../schemas/Warn";
import { Command } from "../types";
import { missingArgs, RtextEmbed, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "warnings",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_warn")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "warnings",
      ` ${message.member}`,
      [
        ` ${message.member}`,
        `${message.member} ${client.user}`,
        `clear ${message.member}`,
        `clear ${message.member} ${client.user}`,
      ]
    );

    if (!args[1]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    if (args[1] == "clear") {
      let user = await client.users
        .fetch(message.mentions.users.first()?.id || args[2], {
          cache: true,
        })
        .catch(() => {});

      let mod = await client.users
        .fetch(message.mentions.users.first(2)[1]?.id || args[3], {
          cache: true,
        })
        .catch(() => {});

      if (!user)
        return textEmbed(
          message,
          `${emoji.error} | The user you've specified was not found. (provide UserID's only!)`
        );

      let userWarns = await WarnModel.find(
        mod
          ? { guildID: message.guild?.id, userID: user.id, modID: mod.id }
          : { guildID: message.guild?.id, userID: user.id }
      ).catch((e) => {
        return console.log(e);
      });

      if (!userWarns || userWarns.length <= 0)
        return textEmbed(
          message,
          `${emoji.error} | No warnings were found with your query.`
        );

      let collectorPrompt = await message.reply({
        embeds: [
          await RtextEmbed(
            `${
              emoji.question
            } |  Are you sure you want to **clear** all of ${user} warnings ${
              mod ? `from ${mod}` : ``
            } **_(${
              userWarns.length
            } warnings)_**. This action is irreversible!`
          ),
        ],
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                customId: "approveClearWarn",
                emoji: `${emoji.approve}`,
                style: ButtonStyle.Success,
              },
              {
                type: ComponentType.Button,
                customId: "declineClearWarn",
                emoji: `${emoji.decline}`,
                style: ButtonStyle.Danger,
              },
            ],
          },
        ],
      });

      let collectorResult = await CollectorUtils.collectByButton(
        collectorPrompt,
        async (buttonInteraction: ButtonInteraction) => {
          switch (buttonInteraction.customId) {
            case "approveClearWarn":
              return { intr: buttonInteraction, value: "approveClearWarn" };
            case "declineClearWarn":
              return { intr: buttonInteraction, value: "declineClearWarn" };
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
          case "approveClearWarn":
            await collectorPrompt.edit({
              embeds: [
                await RtextEmbed(
                  `${emoji.loading} | Please wait while we delete ${user} warnings`
                ),
              ],
              components: [],
            });

            WarnModel.deleteMany(
              mod
                ? { guildID: message.guild?.id, userID: user.id, modID: mod.id }
                : { guildID: message.guild?.id, userID: user.id }
            )
              .then(async (result) => {
                await collectorResult!.intr.update({
                  embeds: [
                    await RtextEmbed(
                      `${emoji.approve} |** A total of ${result.deletedCount} warning(s) have been deleted from ${user} warnings. **`
                    ),
                  ],
                  components: [],
                });
              })
              .catch(async (e) => {
                await collectorResult!.intr.update({
                  embeds: [
                    await RtextEmbed(
                      `${emoji.error} | An unexpected error occured. please try again`
                    ),
                  ],
                  components: [],
                });
                console.log("err deleting warns", e);
              });
            break;
          case "declineClearWarn":
            await collectorResult.intr.update({
              embeds: [
                await RtextEmbed(`${emoji.decline} |** Action cancelled**`),
              ],
              components: [],
            });
            break;
          default:
            collectorResult.intr.update({
              components: [],
            });
            await collectorResult.intr.update({
              embeds: [
                await RtextEmbed(`${emoji.decline} | unknown collector value.`),
              ],
              components: [],
            });
            break;
        }
      }

      return;
    }

    let user = await client.users
      .fetch(message.mentions.users.first()?.id || args[1], {
        cache: true,
      })
      .catch(() => {});

    let mod = await client.users
      .fetch(message.mentions.users.first(2)[1]?.id || args[2], {
        cache: true,
      })
      .catch(() => {});

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you've specified was not found. (provide UserID's only!)`
      );

    let userWarns = await WarnModel.find(
      mod
        ? { guildID: message.guild?.id, userID: user.id, modID: mod.id }
        : { guildID: message.guild?.id, userID: user.id }
    ).catch((e) => {
      return console.log(e);
    });

    if (!userWarns || userWarns.length <= 0)
      return textEmbed(
        message,
        `${emoji.error} | No warnings were found with your query.`
      );

    let dataPerPage = 3;
    let totalEmbeds = Math.ceil(userWarns.length / dataPerPage);

    let i = 0;
    let embeds = [];

    for (let j = 0; j < totalEmbeds; j++) {
      let embedJSON = {
        color: 800080,
        author: {
          name: `${user.tag}`,
          icon_url:
            user.avatarURL({ size: 4096 }) ||
            "https://cdn.discordapp.com/embed/avatars/5.png",
        },
        description: [
          mod
            ? `★ ${user.username} got a total of ${userWarns.length} warnings from <@${mod.id}>\n`
            : `★ ${user.username} got a total of ${userWarns.length} warnings\n`,
          userWarns[i] ? `↱ **Warn ID :: ${userWarns[i].warnID}**` : "",
          userWarns[i] ? `↳ **Moderator** :: <@${userWarns[i].modID}>` : "",
          userWarns[i] ? `↳ **Reason** :: ${userWarns[i].reason}` : "",
          userWarns[i]
            ? `↳ ** Date** :: ${new Date(
                userWarns[i].startAt
              ).toLocaleDateString("fr-FR")}\n`
            : "",
          userWarns[i + 1] ? `↱ **Warn ID :: ${userWarns[i + 1].warnID}**` : "",
          userWarns[i + 1]
            ? `↳ **Moderator** :: <@${userWarns[i + 1].modID}>`
            : "",
          userWarns[i + 1] ? `↳ **Reason** :: ${userWarns[i + 1].reason}` : "",
          userWarns[i + 1]
            ? `↳ ** Date** :: ${new Date(
                userWarns[i + 1].startAt
              ).toLocaleDateString("fr-FR")}\n`
            : "",
          userWarns[i + 2] ? `↱ **Warn ID :: ${userWarns[i + 2].warnID}**` : "",
          userWarns[i + 2]
            ? `↳ **Moderator** :: <@${userWarns[i + 2].modID}>`
            : "",
          userWarns[i + 2] ? `↳ **Reason** :: ${userWarns[i + 2].reason}` : "",
          userWarns[i + 2]
            ? `↳ ** Date** :: ${new Date(
                userWarns[i + 2].startAt
              ).toLocaleDateString("fr-FR")}\n`
            : "",
        ]
          .filter((v) => v != "")
          .join("\n"),
        footer: {
          text: `Requested by ${message.member?.user.tag}`,
          icon_url:
            message.member?.user.avatarURL({ size: 4096 }) ||
            "https://cdn.discordapp.com/embed/avatars/5.png",
        },
      };

      embeds.push(new EmbedBuilder(embedJSON));
      i += dataPerPage;
    }
    sendPagination(message, embeds);
  },
  cooldown: 10,
  aliases: ["warns"],
  permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
