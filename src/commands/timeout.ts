import { PermissionFlagsBits } from "discord.js";
import ms from "enhanced-ms";
import SanctionModel from "../schemas/Sanction";
import { Command } from "../types";

const command: Command = {
  name: "timeout",
  execute: async (client, message, args) => {
    if (!args[1]) {
      return message.reply(
        `:rage: - **&timeout** ${message.member} [duration] [reason]`
      );
    }

    if (["stop", "end"].includes(args[1].toLocaleLowerCase())) {
      if (!args[2]) {
        return message.reply(`:rage: - **&timeout** end ${message.member}`);
      }
      const user =
        message.mentions.members?.first() ||
        (await message.guild?.members
          .fetch({ user: args[2], force: true })
          .catch(() => {}));

      if (!user)
        return message.reply(":triumph: - **unknown user, try again.**");

      if (!user.isCommunicationDisabled())
        return message.reply(
          `:triumph: - **${user} doesn't have an active timeout at the moment.**`
        );
      return user
        .timeout(null, `${message.member?.user.tag} - timeout end`)
        .then(async (user) => {
          message.reply("endtimed out");
        })
        .catch((e) => {
          switch (e.message) {
            case "Unknown User":
              message.reply(":triumph: - **unknown user try again.**");
              break;
            case "Missing Permissions":
              message.reply(
                ":zipper_mouth: - **unfortunately, due to a lack of permissions I cannot perfom this action.**"
              );
              break;
            case "Invalid Form Body":
              message.reply(
                ":face_with_monocle: - **You've malformed the command, try again.**"
              );
              break;
            default:
              message.reply(
                ":flushed: - **an error occurred while trying to execute this command, try again.**"
              );
              console.log(e);
              break;
          }
        });
    }

    if (!args[2]) {
      return message.reply(
        `:rage: - **&timeout** ${message.member} [duration] [reason]`
      );
    }

    const reason: string = args[3] || "no reason specified";
    const duration: string = args[2];

    const user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], force: true })
        .catch(() => {}));

    if (!user) return message.reply(":triumph: - **unknown user, try again.**");

    if (ms(duration) === null)
      return message.reply(
        ":rage: - **the duration you specified is invalid**"
      );

    user
      .timeout(Number(ms(duration)), `${message.member?.user.tag} - ${reason}`)
      .then(async (user) => {
        message.reply("timed out");

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
            message.reply(":triumph: - **unknown user try again.**");
            break;
          case "Missing Permissions":
            message.reply(
              ":zipper_mouth: - **unfortunately, due to a lack of permissions I cannot perfom this action.**"
            );
            break;
          case "Invalid Form Body":
            message.reply(
              ":face_with_monocle: - **You've malformed the command, try again.**"
            );
            break;
          default:
            message.reply(
              ":flushed: - **an error occurred while trying to execute this command, try again.**"
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
