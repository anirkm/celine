import { PermissionFlagsBits } from "discord.js";
import emojies from "../data/emojies.json";
import { hasPermission } from "../functions";
import { Command } from "../types";
import { missingArgs, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "unban",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_ban")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "unban",
      `${message.member} (reason)`,
      [`${message.member}`, `${message.member} reason`]
    );

    if (!args[1]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    let reason: string = args.slice(2).join(" ") || "no reason was specified";

    await message.guild?.members
      .unban(args[1], `${message.member?.user.tag} - ${reason}`)
      .then(async (user) => {
        await textEmbed(
          message,
          `${emojies.confetti} ${
            user ? user : `<@${args[1]}>`
          } has been unbanned.`
        );
        await client.redis
          .del(`banqueue_${message.guild?.id}_${user ? user.id : args[1]}`)
          .catch(() => {})
          .catch((e) => console.log("err deleting queue unban", e));
      })
      .catch(async (e) => {
        switch (e.message) {
          case "Unknown User":
            await textEmbed(
              message,
              `${emojies.error} | User you're trying to unban doesn't exist.`
            );
            break;
          case "Unknown Ban":
            await textEmbed(
              message,
              `${emojies.wym} | <@${args[1]}> isn't banned from this guild.`
            );
            await client.redis
              .del(`banqueue_${message.guild?.id}_${args[1]}`)
              .catch(() => {})
              .catch((e) => console.log("err deleting queue unban", e));
            break;
          case "Invalid Form Body":
            await textEmbed(
              message,
              `${emojies.error} | You've malformed the command, try again.`
            );
            break;
          default:
            await textEmbed(
              message,
              `${emojies.error} An error occured while executing this command.`
            );
            console.log(e);
            break;
        }
      });
  },
  cooldown: 10,
  aliases: [],
  permissions: [PermissionFlagsBits.BanMembers],
};

export default command;
