import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import emoji from "../data/emojies.json";
import { hasPermission, sendPagination } from "../functions";
import WarnModel from "../schemas/Warn";
import { Command } from "../types";
import { missingArgs, textEmbed } from "../utils/msgUtils";
const command: Command = {
  name: "modwarns",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "show_modwarns")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "modwarns",
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
      .fetch(message.mentions.users.first()?.id || args[1] || message.author, {
        cache: true,
      })
      .catch(() => {});

    if (!mod)
      return textEmbed(
        message,
        `${emoji.error} | The moderator you've specified was not found.`
      );

    let modWarns = await WarnModel.find(
      user
        ? { guildID: message.guild?.id, modID: mod.id, userID: user.id }
        : { guildID: message.guild?.id, modID: mod.id }
    ).catch((e) => {
      return console.log(e);
    });

    if (!modWarns || modWarns.length <= 0)
      return textEmbed(
        message,
        `${emoji.error} | No warnings were found with your query.`
      );

    let dataPerPage = 3;
    let totalEmbeds = Math.ceil(modWarns.length / dataPerPage);

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
            ? `★ ${mod.username} gave a total of ${modWarns.length} warnings to <@${user.id}>\n`
            : `★ ${mod.username} gave a total of ${modWarns.length} warnings\n`,
          modWarns[i] ? `↱ **Member** :: <@${modWarns[i].userID}>` : "",
          modWarns[i] ? `↳ **Reason** :: ${modWarns[i].reason}` : "",
          modWarns[i]
            ? `↳ ** Date** :: ${new Date(
                modWarns[i].startAt
              ).toLocaleDateString("fr-FR")}\n`
            : "",
          modWarns[i + 1] ? `↱ **Member** :: <@${modWarns[i + 1].userID}>` : "",
          modWarns[i + 1] ? `↳ **Reason** :: ${modWarns[i + 1].reason}` : "",
          modWarns[i + 1]
            ? `↳ ** Date** :: ${new Date(
                modWarns[i + 1].startAt
              ).toLocaleDateString("fr-FR")}\n`
            : "",
          modWarns[i + 2] ? `↱ **Member** :: <@${modWarns[i + 2].userID}>` : "",
          modWarns[i + 2] ? `↳ **Reason** :: ${modWarns[i + 2].reason}` : "",
          modWarns[i + 2]
            ? `↳ ** Date** :: ${new Date(
                modWarns[i + 2].startAt
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
