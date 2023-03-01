import { PermissionFlagsBits } from "discord.js";
import SanctionQueueModel from "../schemas/SanctionQueue";
import { Command } from "../types";

const command: Command = {
  name: "unban",
  execute: async (client, message, args) => {
    console.log(client);
    if (!args[1]) return message.reply(`:rage: - **&unban [userId] [reason]**`);

    let reason: string = args.slice(2).join(" ") || "no reason was specified";

    await message.guild?.members
      .unban(args[1], `${message.member?.user.tag} - ${reason}`)
      .then(async () => {
        message.reply(
          `:partying_face: - **<@${args[1]}> successfully unbanned.**`
        );
        await SanctionQueueModel.remove({
          userID: args[1],
          type: "Ban",
        }).catch((e) => console.log("err deleting queue unban", e));
      })
      .catch((e) => {
        switch (e.message) {
          case "Unknown User":
            message.reply(":triumph: - **unknown user try again.**");
            break;
          case "Unknown Ban":
            message.reply(":flushed: - **this user is not banned.**");
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
  permissions: [PermissionFlagsBits.BanMembers],
};

export default command;
