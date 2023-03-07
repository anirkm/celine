import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import ms from "enhanced-ms";
import emoji from "../data/emojies.json";
import { sendPagination } from "../functions";
import SanctionModel from "../schemas/Sanction";
import { Command } from "../types";
import { missingArgs, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "history",
  execute: async (client, message, args) => {
    let argsEmbed = await missingArgs(
      message,
      "history",
      ` ${message.member} ${client.user}`,
      [` ${message.member}`, `${message.member} ${client.user}`]
    );

    if (!args[1] && !message.author.id) {
      return message.reply({ embeds: [argsEmbed] });
    }

    let user = await client.users
      .fetch(message.mentions.users.first()?.id || args[1] || message.author, {
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
        `${emoji.error} | The user  you've specified was not found.`
      );

    let userSanctions = await SanctionModel.find(
      mod
        ? { guildID: message.guild?.id, userID: user.id, modID: mod.id }
        : { guildID: message.guild?.id, userID: user.id }
    ).catch((e) => {
      return console.log(e);
    });

    if (!userSanctions || userSanctions.length <= 0)
      return textEmbed(
        message,
        `${emoji.error} | No sactions were found with your query.`
      );

    let dataPerPage = 3;
    let totalEmbeds = Math.ceil(userSanctions.length / dataPerPage);

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
            ? `★ ${user.username} got a total of ${userSanctions.length} sanctions from <@${mod.id}>\n`
            : `★ ${user.username} got a total of ${userSanctions.length} sanctions\n`,
          `★ Banned ${userSanctions
            .filter((o) => o.type == "Ban")
            .length.toString()} time(s)`,
          `★ Jailed ${userSanctions
            .filter((o) => o.type == "Jail")
            .length.toString()} time(s)`,
          `★ Muted ${userSanctions
            .filter((o) => o.type == "Mute")
            .length.toString()} time(s)`,
          `★ Timeouted ${userSanctions
            .filter((o) => o.type == "Timeout")
            .length.toString()} time(s)\n`,
          userSanctions[i] ? `↱ **Type :: __${userSanctions[i].type}__**` : "",
          userSanctions[i]
            ? `↳ **Moderator** :: <@${userSanctions[i].modID}>`
            : "",
          userSanctions[i] && userSanctions[i].duration
            ? `↳ **Duration** :: ${ms(
                ms(userSanctions[i].duration!, { roundUp: true })
              )}`
            : "",
          userSanctions[i] ? `↳ **Reason** :: ${userSanctions[i].reason}` : "",
          userSanctions[i]
            ? `↳ ** Date** :: ${new Date(
                userSanctions[i].startAt
              ).toLocaleDateString("fr-FR")}\n`
            : "",
          userSanctions[i + 1]
            ? `↱ **Type :: __${userSanctions[i + 1].type}__**`
            : "",
          userSanctions[i + 1]
            ? `↳ **Moderator** :: <@${userSanctions[i + 1].modID}>`
            : "",
          userSanctions[i + 1] && userSanctions[i + 1].duration
            ? `↳ **Duration** :: ${ms(
                ms(userSanctions[i + 1].duration!, {
                  roundUp: true,
                })
              )}`
            : "",
          userSanctions[i + 1]
            ? `↳ **Reason** :: ${userSanctions[i + 1].reason}`
            : "",
          userSanctions[i + 1]
            ? `↳ ** Date** :: ${new Date(
                userSanctions[i + 1].startAt
              ).toLocaleDateString("fr-FR")}\n`
            : "",
          userSanctions[i + 2]
            ? `↱ **Type :: __${userSanctions[i + 2].type}__**`
            : "",
          userSanctions[i + 2]
            ? `↳ **Moderator** :: <@${userSanctions[i + 2].modID}>`
            : "",
          userSanctions[i + 2] && userSanctions[i + 2].duration
            ? `↳ **Duration** :: ${ms(
                ms(userSanctions[i + 2].duration!, {
                  roundUp: true,
                })
              )}`
            : "",
          userSanctions[i + 2]
            ? `↳ **Reason** :: ${userSanctions[i + 2].reason}`
            : "",
          userSanctions[i + 2]
            ? `↳ ** Date** :: ${new Date(
                userSanctions[i + 2].startAt
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
