import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import ms from "enhanced-ms";
import emoji from "../data/emojies.json";
import { hasPermission } from "../functions";
import SanctionModel from "../schemas/Sanction";
import { Command } from "../types";
import { missingArgs, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "timeout",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, await message.member!, "use_timeout")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "timeout",
      `${message.member} [duration] (reason)`,
      [`${message.member} 1337s`, `${message.member} 1337s reason`]
    );

    if (!args[1] || !args[2]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    const reason: string = args[3] || "no reason specified";
    const duration: string = args[2];

    const user = await message.guild?.members
      .fetch({
        user: message.mentions.members?.first() || args[1],
        cache: true,
      })
      .catch(() => {});

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you specified was not found.`
      );

    if (user.permissions.has(PermissionFlagsBits.Administrator))
      return textEmbed(
        message,
        `${emoji.error} | Timeouts can't be executed on administrators.`
      );

    if (!parseInt(duration) || !ms(duration)) {
      return textEmbed(
        message,
        `${emoji.huh} | The duration you've specified is invalid`
      );
    }

    if (ms(duration) !== null) {
      if (ms(duration) < ms("10s") || ms(duration) > ms("1month")) {
        return textEmbed(
          message,
          `${emoji.error} | The duration should be between 10 seconds and 1 month.`
        );
      }
    }

    user
      .timeout(Number(ms(duration)), `${message.member?.user.tag} - ${reason}`)
      .then(async (user) => {
        textEmbed(
          message,
          `${emoji.muted} | ${user} has been timedout for the next ${ms(
            Number(ms(duration)),
            {
              roundUp: false,
            }
          )}.`
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
              "**You have been timeouted from this guild.**\n",
              `__Reason__ :: ${reason}`,
              `__Duration__ :: ${ms(duration, {
                roundUp: false,
              })}`,
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
          type: "Timeout",
          duration: duration,
          reason: reason,
          startAt: new Date(),
        });
        await newTimeout
          .save()
          .then(() => {
            console.log("Debug: new timeout queue saved");
          })
          .catch((err) => {
            console.log("debug: err while saving timeout queue", err);
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
  aliases: ["to"],
  permissions: [PermissionFlagsBits.ModerateMembers],
};

export default command;
