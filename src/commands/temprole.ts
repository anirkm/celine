import { Collection, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import ms from "enhanced-ms";
import emoji from "../data/emojies.json";
import { getGuildRole } from "../functions";
import { Command } from "../types";
import { missingArgs, RtextEmbed, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "temprole",
  execute: async (client, message, args) => {
    let argsEmbed = await missingArgs(
      message,
      "temprole",
      `${message.member} [role | roldId] [duration]`,
      [`${message.member} ${message.member?.roles.highest} 1337d`]
    );

    if (!args[1] || !args[2] || !args[3]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    let user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], force: true })
        .catch(() => {}));

    let role =
      message.mentions.roles.first() ||
      (await getGuildRole(message.guild!, args[2]));

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

    if (role instanceof Collection && role.size > 1) {
      return textEmbed(
        message,
        `${emoji.huh} | Too many roles with this name choose a role using it's ID.`
      );
    }

    role instanceof Collection ? (role = role.toJSON()[0]) : (role = role);

    if (ms(args[3]) === null)
      return textEmbed(
        message,
        `${emoji.error} | The duration you've specified is invalid.`
      );

    if (ms(args[3]) < ms("1m"))
      return textEmbed(
        message,
        `${emoji.huh} | Minimum duration of 1 minute is not reached.`
      );

    if (ms(args[3]) > ms("30d"))
      return textEmbed(
        message,
        `${emoji.huh} | Maximum duration of 30 days is execed.`
      );

    let duration = ms(args[3]);

    if (message.member?.roles.highest.position! <= role.position) {
      return textEmbed(
        message,
        `${emoji.error} | You can't perform this action due to hierarchy issues`
      );
    }

    await user.roles
      .add(role, `${message.member?.user.tag} - temprole`)
      .then((member) => {
        let trEmbed = new EmbedBuilder()
          .setAuthor({
            name: `${member.user.tag}`,
            iconURL:
              member.avatarURL({ size: 4096 }) ||
              "https://cdn.discordapp.com/embed/avatars/5.png",
          })
          .setDescription(
            `${user} has been granted the ${role} role for ${ms(duration)}`
          )
          .setFooter({ text: `Executed by ${message.member?.user.tag}` })
          .setTimestamp();

        client.redis
          .set(
            `tr_${message.guild?.id}_${member.id}_${
              role instanceof Collection
                ? role.values().next().value.id
                : role!.id
            }`,
            new Date().getTime() + duration
          )
          .then(async () => {
            await message.reply({ embeds: [trEmbed] });
          })
          .catch(async (e) => {
            await member.roles.remove(role!, `temprole error`).catch((e) => {
              console.log("tr error correction role", e);
            });
            await message.reply({
              embeds: [
                await RtextEmbed(
                  `${emoji.error} | An error occurred while trying to execute this command, try again.. (Code: Redis)`
                ),
              ],
            });
            return console.log("setting temprole redis", e);
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
  aliases: ["tr"],
  permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
