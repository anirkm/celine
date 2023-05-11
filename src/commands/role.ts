import { PermissionFlagsBits } from "discord.js";
import { fuzzyRoleSearch, hasPermission } from "../functions";
import emoji from "../data/emojies.json";
import { Command } from "../types";
import { missingArgs, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "role",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_role")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return;
    }

    let argsEmbed = await missingArgs(
      message,
      "role",
      `${message.member} [role | role id | role name]`,
      [
        `${message.member} ${message.member?.roles.highest}`,
        `${message.member} ${message.member?.roles.highest.name}`,
      ]
    );

    if (args.length < 2) {
      return message.reply({ embeds: [argsEmbed] });
    }

    const user = await message.guild?.members
      .fetch({
        user: message.mentions.parsedUsers.first() || args[1],
        cache: true,
      })
      .catch(() => {});

    let role =
      message.mentions.roles.first() ||
      message.guild?.roles.cache.get(args[2]) ||
      message.guild?.roles.cache.get(
        fuzzyRoleSearch(
          message.guild!,
          args
            .slice(2, args.length)
            .filter((x) => x !== undefined)
            .join("")
        )[0].id
      );

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you've specified was not found.`
      );

    if (!role)
      return textEmbed(
        message,
        `${emoji.error} | The role you've specified was not found.`
      );

    if (role.managed) {
      return textEmbed(
        message,
        `${emoji.error} | ${role} is managed and therefore cannot be assigned or removed.`
      );
    }

    if (message.member?.roles.highest.position! <= role.position) {
      return textEmbed(
        message,
        `${emoji.error} | You can't perform this action due to hierarchy issues`
      );
    }

    if (user.roles.cache.has(role.id)) {
      user.roles
        .remove(role, `&role command used by ${message.member?.user.tag}`)
        .then(() => {
          textEmbed(
            message,
            `${emoji.leave} | ${role} has been removed from ${user}`
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
    } else {
      user.roles
        .add(role, `&role command used by ${message.member?.user.tag}`)
        .then(() => {
          textEmbed(
            message,
            `${emoji.enter} | ${role} has been given to ${user}`
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
    }
  },
  cooldown: 10,
  aliases: [],
  permissions: [],
};

export default command;
