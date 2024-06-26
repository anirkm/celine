import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import emoji from "../data/emojies.json";
import { genId, hasPermission } from "../functions";
import { Command } from "../types";
import { missingArgs, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "alert",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_alert")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "alert",
      `${message.member} (message)`,
      [`${message.member} uwu`]
    );

    if (!args[1] || !args[2]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    const user = await message.guild?.members
      .fetch({
        user: message.mentions.parsedUsers.first() || args[1],
        cache: true,
      })
      .catch(() => {});

    let reason = args.slice(2).join(" ");

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you've specified was not found.`
      );

    if (message.attachments.size > 3) {
      return textEmbed(
        message,
        `${emoji.error} | The maximum allowed attachements limit is 3.`
      );
    }
    let id = genId(6);
    let msgEmbed = new EmbedBuilder()
      .setAuthor({
        name: `In: ${message.guild?.name || "Failed to fetch guild name"}`,
        iconURL:
          message.guild?.iconURL({ size: 4096 }) ||
          "https://cdn.discordapp.com/embed/avatars/5.png",
      })
      .setDescription(
        `**ID**: \`${id}\`\n**From ${
          message.member?.permissions.has(PermissionFlagsBits.Administrator)
            ? "Admin"
            : "Staff"
        }**: ${reason}`
      )
      .setTimestamp();

    console.log(Array.from(message.attachments.values()));
    user
      .send({
        embeds: [msgEmbed],
      })
      .then(() => {
        if (message.attachments.size > 0) {
          user!
            .send({
              content: `**${message.attachments.size} attachements were sent for id: \`${id}\`: **`,
              files: Array.from(message.attachments.values()),
            })
            .then(() => {
              return textEmbed(
                message,
                `${emoji.approve} | ${user} has been successfully alerted.`
              );
            })
            .catch(() => {
              return textEmbed(
                message,
                `${emoji.approve} | ${user} has been successfully alerted. but i couldn't send the attachements`
              );
            });
        } else {
          return textEmbed(
            message,
            `${emoji.approve} | ${user} has been successfully alerted.`
          );
        }
      })
      .catch(() => {
        return textEmbed(
          message,
          `${emoji.error} | Attempt to DM ${user} was unsuccessful _(his dm's are probably closed)_`
        );
      });
  },
  cooldown: 10,
  aliases: [],
  permissions: [],
};

export default command;
