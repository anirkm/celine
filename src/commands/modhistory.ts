import { Embed, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { Command } from "../types";
import ms from "enhanced-ms";
import { sendPagination } from "../functions";
import SanctionModel from "../schemas/Sanction";
import { missingArgs } from "../utils/msgUtils";
import { textEmbed, RtextEmbed } from "../utils/msgUtils";
import emoji from "../data/emojies.json";

const command: Command = {
  name: "modhistory",
  execute: async (client, message, args) => {
    let argsEmbed = await missingArgs(
      message,
      "modhistory",
      `${client.user} ${message.member}`,
      [`${client.user}`, `${client.user} ${message.member}`]
    );

    if (!args[1] && !message.author.id) {
      return message.reply({ embeds: [argsEmbed] });
    }

    let user = await client.users
      .fetch(message.mentions.users.first(2)[1]?.id || args[2], {
        cache: true,
      })
      .catch(() => {});

    let mod = await client.users
      .fetch(message.mentions.users.first()?.id || args[1], {
        cache: true,
      })
      .catch(() => {});

    if (!mod)
      return textEmbed(
        message,
        `${emoji.error} | The moderator you've specified was not found.`
      );

    let modSanctions = await SanctionModel.find(
      user
        ? { guildID: message.guild?.id, modID: mod.id, userID: user.id }
        : { guildID: message.guild?.id, modID: mod.id }
    ).catch((e) => {
      return console.log(e);
    });

    if (!modSanctions || modSanctions.length <= 0)
      return textEmbed(
        message,
        `${emoji.error} | No sactions were found with your query.`
      );

    let dataPerPage = 3;
    let totalEmbeds = Math.ceil(modSanctions.length / dataPerPage);

    let i = 0;
    let embeds = [];

    for (let j = 0; j < totalEmbeds; j++) {
      let embedJSON = {
        color: 800080,
        author: {
          name: `${mod.tag}`,
          icon_url:
            mod.avatarURL({ size: 4096 }) ||
            "https://cdn.discordapp.com/embed/avatars/5.png",
        },
        description: [
          user
            ? `★ ${mod.username} executed a total of ${modSanctions.length} sanctions on <@${user.id}>\n`
            : `★ ${mod.username} executed a total of ${modSanctions.length} sanctions\n`,
          modSanctions[i] ? `↱ **Type :: __${modSanctions[i].type}__**` : "",
          modSanctions[i] ? `↳ **Member** :: <@${modSanctions[i].userID}>` : "",
          modSanctions[i] && modSanctions[i].duration
            ? `↳ **Duration** :: ${ms(
                ms(modSanctions[i].duration!, { roundUp: true })
              )}`
            : "",
          modSanctions[i] ? `↳ **Reason** :: ${modSanctions[i].reason}` : "",
          modSanctions[i]
            ? `↳ ** Date** :: ${new Date(
                modSanctions[i].startAt
              ).toLocaleDateString("fr-FR")}\n`
            : "",
          modSanctions[i + 1]
            ? `↱ **Type :: __${modSanctions[i + 1].type}__**`
            : "",
          modSanctions[i + 1]
            ? `↳ **Member** :: <@${modSanctions[i + 1].userID}>`
            : "",
          modSanctions[i + 1] && modSanctions[i + 1].duration
            ? `↳ **Duration** :: ${ms(
                ms(modSanctions[i + 1].duration!, {
                  roundUp: true,
                })
              )}`
            : "",
          modSanctions[i + 1]
            ? `↳ **Reason** :: ${modSanctions[i + 1].reason}`
            : "",
          modSanctions[i + 1]
            ? `↳ ** Date** :: ${new Date(
                modSanctions[i + 1].startAt
              ).toLocaleDateString("fr-FR")}\n`
            : "",
          modSanctions[i + 2]
            ? `↱ **Type :: __${modSanctions[i + 2].type}__**`
            : "",
          modSanctions[i + 2]
            ? `↳ **Member** :: <@${modSanctions[i + 2].userID}>`
            : "",
          modSanctions[i + 2] && modSanctions[i + 2].duration
            ? `↳ **Duration** :: ${ms(
                ms(modSanctions[i + 2].duration!, {
                  roundUp: true,
                })
              )}`
            : "",
          modSanctions[i + 2]
            ? `↳ **Reason** :: ${modSanctions[i + 2].reason}`
            : "",
          modSanctions[i + 2]
            ? `↳ ** Date** :: ${new Date(
                modSanctions[i + 2].startAt
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

    await sendPagination(message, embeds);
  },
  cooldown: 10,
aliases: [],
permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
