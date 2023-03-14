import { PermissionFlagsBits } from "discord.js";
import ms from "enhanced-ms";
import emoji from "../data/emojies.json";
import { hasPermission } from "../functions";
import GuildModel from "../schemas/Guild";
import SanctionModel from "../schemas/Sanction";
import { Command } from "../types";
import { missingArgs, RtextEmbed, textEmbed } from "../utils/msgUtils";

const command: Command = {
  name: "mute",
  execute: async (client, message, args) => {
    if (
      !(await hasPermission(client, message.member!, "use_mute")) &&
      !message.member!.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;

    let argsEmbed = await missingArgs(
      message,
      "mute",
      `${message.member} [duration] (reason)`,
      [`${message.member} 1337s`, `${message.member} 1337s reason`]
    );

    if (!args[1] || !args[2]) {
      return message.reply({ embeds: [argsEmbed] });
    }

    let user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], force: true })
        .catch(() => {}));

    if (!user)
      return textEmbed(
        message,
        `${emoji.error} | The user you specified was not found.`
      );

    let reason: string = args[3] || "no reason was specified";
    let muteRole;

    if (!ms(args[2])) {
      return textEmbed(
        message,
        `${emoji.huh} | The duration you've specified is invalid`
      );
    }

    if (ms(args[2]) !== null) {
      if (ms(args[2]) < ms("10s") || ms(args[2]) > ms("1month")) {
        return textEmbed(
          message,
          `${emoji.error} | The duration should be between 10 seconds and 1 month.`
        );
      }
    }

    let duration: number = ms(args[2]);

    let guild = await GuildModel.findOne({ guildID: message.guild?.id });

    if (!guild)
      return textEmbed(
        message,
        `${emoji.error} | This guild isn't correctly setup. run __&cfg sg__.`
      );

    if (guild && !guild.options.jailRole)
      return textEmbed(
        message,
        `${emoji.error} | Mute role for this guild isn't correctly setup. run __&cfg muterole__.`
      );
    muteRole = await message.guild?.roles.fetch(guild.options.muteRole);

    if (!muteRole)
      return textEmbed(
        message,
        `${emoji.error} | Mute role for this guild is invalid setup. run __&cfg muterole__.`
      );

    user.roles
      .add(muteRole, `${message.member?.user.tag} - ${reason}`)
      .then(async (user) => {
        textEmbed(
          message,
          `${emoji.muted} | ${user} has been muted for ${ms(duration, {
            roundUp: false,
          })}.`
        );

        await user
          .send({
            embeds: [
              await RtextEmbed(
                `${emoji.muted} | You've been muted in **${
                  message.guild?.name || "Failed to fetch guild name"
                }** - Duration: ` +
                  "`" +
                  `${ms(duration) || "wtf?"}` +
                  "`" +
                  "- Reason: " +
                  "`" +
                  `${reason}` +
                  "`."
              ),
            ],
          })
          .catch(() => {});

        let newMute = new SanctionModel({
          guildID: message.guild?.id,
          modID: message.member?.id,
          userID: user.id,
          type: "Mute",
          reason: reason,
          duration: ms(duration, {
            roundUp: true,
          }),
          startAt: new Date(),
        });

        await client.redis
          .keys(`mutequeue_${message.guild?.id}_${user.id}`)
          .then((keys) => {
            if (keys.length !== 0) {
              client.redis.del(keys).catch((e) => {
                console.log("del mute keys redis err", e);
              });
            }
          });

        await newMute
          .save()
          .then(async (doc) => {
            doc.save();
            client.redis
              .set(
                `mutequeue_${message.guild?.id}_${user.id}`,
                new Date().getTime() + ms(args[2])
              )
              .catch((e) => {
                console.log("err while seting mute queue", e);
              });
          })
          .catch((err) => {
            console.log("debug: err while saving jail", err);
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
  permissions: [PermissionFlagsBits.ManageRoles],
};

export default command;
