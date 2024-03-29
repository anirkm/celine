import { PermissionFlagsBits } from "discord.js";
import { hasPermission } from "../functions";
import emoji from "../data/emojies.json";
import { Command } from "../types";
import { missingArgs, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "untimeout",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, await message.member!, "use_timeout")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "untimeout",
      `${message.member} (reason)`,
      [`${message.member} expired`],
    );

    if (!args[1]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    const user = await message.guild?.members
      .fetch({
        user: message.mentions.parsedUsers.first() || args[1],
        cache: true,
      })
      .catch(() => {});

    const reason = args[2] || "no reason specified";

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you specified was not found.`,
      );
    if (!user.isCommunicationDisabled())
      return textEmbed(
        message,
        `${emoji.error} | ${user} is not timed out at the moment.`,
      );
    return user
      .timeout(null, `${message.member?.user.tag} - timeout end`)
      .then(async (user) => {
        textEmbed(
          message,
          `${emoji.muted} | ${user} timeout has been successfully removed.`,
        );
      })
      .catch((e) => {
        switch (e.message) {
          case "Unknown User":
            textEmbed(message, `${emoji.error} | Invalid user, Try again.`);
            break;
          case "Missing Permissions":
            textEmbed(
              message,
              `${emoji.error} | Due to missing permissions i can't execute this command on ${user}.`,
            );
            break;
          case "Invalid Form Body":
            textEmbed(
              message,
              `${emoji.error} | You've malformed the command, try again.`,
            );
            break;
          default:
            textEmbed(
              message,
              `${emoji.error} | An error occurred while trying to execute this command, try again.. (DiscordAPI: ${e.message})`,
            );
            console.log(e);
            break;
        }
      });
  },
  cooldown: 10,
  aliases: ["uto"],
  permissions: [PermissionFlagsBits.ModerateMembers],
};

export default command;
