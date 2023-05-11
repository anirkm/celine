import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { hasPermission } from "../functions";
import emoji from "../data/emojies.json";
import SanctionModel from "../schemas/Sanction";
import { Command } from "../types";
import { missingArgs, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "kick",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, await message.member!, "use_kick")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "kick",
      `${message.member} (reason)`,
      [`${message.member}`, `${message.member} huh`]
    );

    if (!args[1] || !args[2]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    const reason: string = args[3] || "no reason specified";
    const duration: string = args[2];

    const user = await message.guild?.members
      .fetch({
        user: message.mentions.parsedUsers.first() || args[1],
        cache: true,
      })
      .catch(() => {});

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you specified was not found.`
      );

    if (user.roles.highest.position >= message.member!.roles.highest.position)
      return textEmbed(
        message,
        `${emoji.error} | You can't kick someone with higher or equal hierarchy than you.`
      );

    user
      .kick(`${message.member?.user.tag} - ${reason}`)
      .then(async (user) => {
        textEmbed(
          message,
          `${emoji.muted} | ${user} has been kicked from the server.`
        );

        let notifEm = new EmbedBuilder()
          .setAuthor({
            name: message.guild!.name,
            iconURL:
              message.guild?.iconURL() ||
              "https://cdn.discordapp.com/avatars/490667823392096268/7ccc56164f0adcde7fe00ef4384785ee.png?size=1024",
          })
          .setDescription(
            [
              "**You have been kicked from this guild.**\n",
              `__Reason__ :: ${reason}`,
            ].join("\n")
          )
          .setTimestamp()
          .setFooter({
            text: user.user.tag,
            iconURL:
              user.user.displayAvatarURL() ||
              "https://cdn.discordapp.com/avatars/490667823392096268/7ccc56164f0adcde7fe00ef4384785ee.png?size=1024",
          });

        user
          .send({
            embeds: [notifEm],
          })
          .catch(() => {});

        const newTimeout = new SanctionModel({
          guildID: message.guild?.id,
          modID: message.member?.id,
          userID: user.id,
          type: "Kick",
          duration: duration,
          reason: reason,
          startAt: new Date(),
        });
        await newTimeout
          .save()
          .then(() => {
            console.log("Debug: new kick queue saved");
          })
          .catch((err) => {
            console.log("debug: err while saving kick queue", err);
          });
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
  permissions: [PermissionFlagsBits.ModerateMembers],
};

export default command;
