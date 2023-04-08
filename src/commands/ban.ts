import crypto from "crypto";
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import ms from "enhanced-ms";
import emoji from "../data/emojies.json";
import { hasPermission, protectionCheck } from "../functions";
import SanctionModel from "../schemas/Sanction";
import { Command } from "../types";
import { missingArgs, RtextEmbed, textEmbed } from "../utils/msgUtils";

const errorMessages = {
  invalidUser: `${emoji.error} » Specified user is invalid, try again.`,
  malformedCommand: `${emoji.error} | You've malformed the command, try again.`,
};

const command: Command = {
  name: "ban",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_ban")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "ban",
      `${message.member} (duration) (reason)`,
      [
        `${message.member}`,
        `${message.member} reason`,
        `${message.member} 1337d reason`,
      ]
    );

    if (!args[1]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    const userToBan = await message.guild?.members
      .fetch({
        user: message.mentions.members?.first() || args[1],
        cache: true,
      })
      .catch(() => {});

    const duration =
      args.length >= 4 && parseInt(args[2]) && ms(args[2]) !== null
        ? ms(args[2])
        : "lifetime";
    const reason =
      args
        .slice(
          args.length >= 4 && Number(args[2]) && ms(args[2]) !== null ? 3 : 2
        )
        .join(" ") || "no reason specified";

    if (
      duration !== "lifetime" &&
      (ms(args[2]) < ms("10m") || ms(args[2]) > ms("1y"))
    ) {
      return textEmbed(
        message,
        `${emoji.error} | The duration should be between 10 minutes and 1 year.`
      );
    }

    if (userToBan && !userToBan.bannable) {
      return textEmbed(
        message,
        `${emoji.error} | Due to role hierarchy i can't execute this command on ${userToBan}.`
      );
    }

    if (
      userToBan &&
      (await protectionCheck(message.guild!, userToBan)) &&
      !message.member?.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return textEmbed(
        message,
        `${emoji.warning} | This command can only be executed on this user by an administrator.`
      );
    }

    if (userToBan) {
      if (
        userToBan.roles.highest.position >=
        message.member!.roles.highest.position
      )
        return textEmbed(
          message,
          `${emoji.error} | You cannot ban someone with higher or equal hierarchy than you.`
        );
    }

    const _id = crypto.randomBytes(10).toString("hex");

    if (userToBan) {
      let notifEm = new EmbedBuilder()
        .setAuthor({
          name: message.guild!.name,
          iconURL:
            message.guild?.iconURL() ||
            "https://cdn.discordapp.com/avatars/490667823392096268/7ccc56164f0adcde7fe00ef4384785ee.png?size=1024",
        })
        .setDescription(
          [
            "**You have been banned from this guild.**\n",
            `__Ban ID__ :: ${_id}`,
            `__Reason__ :: ${reason}`,
            `__Duration__ :: ${
              duration === "lifetime" ? "permanant" : `${ms(ms(args[2]))}`
            }`,
          ].join("\n")
        )
        .setTimestamp()
        .setFooter({
          text: userToBan.user.tag,
          iconURL:
            userToBan.user.displayAvatarURL() ||
            "https://cdn.discordapp.com/avatars/490667823392096268/7ccc56164f0adcde7fe00ef4384785ee.png?size=1024",
        });
      userToBan.send({ embeds: [notifEm] }).catch(() => {});
    }

    message.guild?.members
      .ban(userToBan?.id || args[1], {
        reason: `${message.member?.user.tag} - ${reason}`,
      })
      .then(async (banned) => {
        message.reply({
          embeds: [
            await RtextEmbed(
              `**${emoji.ban} | ${
                typeof banned === "string" ? `@<${banned}>` : `${banned}`
              } has been ${
                duration === "lifetime" ? "permanently" : ""
              } banned${
                duration !== "lifetime" && duration
                  ? ` for the next ${ms(Number(duration), { roundUp: true })}.`
                  : "."
              }**`
            ),
          ],
        });

        let newBan = new SanctionModel({
          sanctionId: _id,
          guildID: message.guild?.id,
          modID: message.member?.id,
          userID: userToBan ? userToBan.id : args[1],
          type: "Ban",
          duration: duration !== "lifetime" ? args[2] : undefined,
          reason: reason,
          startAt: new Date(),
        });

        await newBan
          .save()
          .then(async () => {
            if (duration && duration !== "lifetime" && ms(args[2])) {
              client.redis
                .set(
                  `banqueue_${message.guild?.id}_${
                    userToBan ? userToBan.id : args[1]
                  }`,
                  new Date().getTime() + ms(args[2])
                )
                .catch((e) => {
                  console.log("save redis ban err", e);
                });
            } else {
              await client.redis
                .del(
                  `banqueue_${message.guild?.id}_${
                    userToBan ? userToBan.id : args[1]
                  }`
                )
                .catch((e) => {
                  console.log("redis delete ban keys err", e);
                });
            }
          })
          .catch((e) => {
            console.log("save mongo ban err", e);
          });
      })
      .catch((e) => {
        switch (e.message) {
          case "Unknown User":
            textEmbed(message, errorMessages.invalidUser);
            break;
          case "Invalid Form Body":
            textEmbed(message, errorMessages.malformedCommand);
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
  permissions: [PermissionFlagsBits.BanMembers],
};

export default command;
