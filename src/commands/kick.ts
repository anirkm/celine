import { PermissionFlagsBits } from "discord.js";
import SanctionModel from "../schemas/Sanction";
import { Command } from "../types";

const command: Command = {
  name: "kick",
  execute: async (client, message, args) => {
    if (!args[1]) {
      return message.reply(`:rage: - **&kick** ${message.member} [reason]`);
    }

    let user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], force: true })
        .catch(() => {}));

    let reason = args.slice(2).join(" ") || "no reason was specified";

    if (!user) return message.reply(":triumph: - **unknown user try again.**");

    await user
      .kick(`${message.member?.user.tag} - ${reason}`)
      .then(async (user) => {
        message.reply(`:wave: - **<@${user.id}> successfully kicked.**`);
        let newKick = new SanctionModel({
          guildID: message.guild?.id,
          modID: message.member?.id,
          userID: user.id,
          type: "Kick",
          reason: reason,
          startAt: new Date(),
        });

        await newKick
          .save()

          .then(() => {
            console.log("Debug: new kick saved");
          })
          .catch((err) => {
            console.log("debug: err while saving kick", err);
          });
      })
      .catch((e) => {
        switch (e.message) {
          case "Unknown User":
            message.reply(":triumph: - **unknown user try again.**");
            break;
          case "Missing Permissions":
            message.reply(
              `:zipper_mouth: - **unfortunately, due to a lack of permissions I cannot kick ${user}.**`
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
  aliases: [],
  permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
