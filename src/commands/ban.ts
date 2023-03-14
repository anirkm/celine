import { PermissionFlagsBits } from "discord.js";
import ms from "enhanced-ms";
import emoji from "../data/emojies.json";
import { hasPermission, protectionCheck } from "../functions";
import SanctionModel from "../schemas/Sanction";
import { Command } from "../types";
import { missingArgs, RtextEmbed, textEmbed } from "../utils/msgUtils";

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

    let emAr = [
      "<:pepoban:1063756755995217961>",
      "<:pepeban:1063756133942181978>",
      "<:banned:1063755520017694772>",
    ];

    let userToBan =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], force: true })
        .catch(() => {}));

    let reason: string;
    let duration: string;

    if (args.length >= 4 && ms(args[2]) !== null) {
      if (ms(args[2]) < ms("10m") || ms(args[2]) > ms("1y")) {
        return textEmbed(
          message,
          `${emoji.error} | The duration should be between 10 minutes and 1 year.`
        );
      }
    }
    args.length >= 4 && ms(args[2]) !== null
      ? ((reason = args.slice(3).join(" ")), (duration = ms(args[2])))
      : ((reason = args.slice(2).join(" ")), (duration = "lifetime"));

    if (
      args.length === 3 &&
      ms(args[2]) !== null &&
      ms(args[2]) >= ms("10m") &&
      ms(args[2]) <= ms("1y")
    ) {
      console.log("d");
      duration = ms(args[2]);
      reason = "no reason specified";
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
      await userToBan
        .send({
          embeds: [
            await RtextEmbed(
              `${
                emAr[Math.floor(Math.random() * emAr.length)]
              } | You've been banned from **${
                message.guild?.name || "Failed to fetch guild name"
              }** - Reason: ` +
                "`" +
                `${reason}` +
                "`" +
                "- Duration: " +
                "`" +
                `${ms(duration) || "Lifetime"}` +
                "`."
            ),
          ],
        })
        .catch(() => {});
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
              } has been banned${
                duration !== "lifetime" && duration
                  ? ` during the next ${ms(Number(duration), {
                      roundUp: true,
                    })}.`
                  : "."
              }**`
            ),
          ],
        });

        if (duration && duration !== "lifetime" && ms(args[2])) {
          let newBan = new SanctionModel({
            guildID: message.guild?.id,
            modID: message.member?.id,
            userID: userToBan ? userToBan.id : args[1],
            type: "Ban",
            duration: args[2],
            reason: reason,
            startAt: new Date(),
          });

          await newBan
            .save()
            .then(async () => {
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
            })
            .catch((e) => {
              console.log("save mongo ban err", e);
            });
        } else {
          let newBan = new SanctionModel({
            guildID: message.guild?.id,
            modID: message.member?.id,
            userID: userToBan ? userToBan.id : args[1],
            type: "Ban",
            reason: reason,
            startAt: new Date(),
          });

          await newBan
            .save()
            .then(async () => {
              await client.redis
                .del(
                  `banqueue_${message.guild?.id}_${
                    userToBan ? userToBan.id : args[1]
                  }`
                )
                .catch((e) => {
                  console.log("redis delete ban keys err", e);
                });
            })
            .catch((e) => {
              console.log("save mongo ban err", e);
            });
        }
      })
      .catch((e) => {
        switch (e.message) {
          case "Unknown User":
            textEmbed(
              message,
              `${emoji.error} » Specified user is invalid, try again.`
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
  permissions: [PermissionFlagsBits.BanMembers],
};

export default command;
