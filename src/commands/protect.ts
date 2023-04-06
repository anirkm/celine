import { PermissionFlagsBits } from "discord.js";
import GuildModel from "../schemas/Guild";
import { Command } from "../types";

const command: Command = {
  name: "protect",
  execute: async (client, message, args) => {

    if (
      ![
        "428692060619407370",
        "490667823392096268",
        "786356804107108403",
      ].includes(message.member!.id)
    )
      return;

    let query = args[1];

    if (!query) return message.reply("no query");

    let user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], cache: true })
        .catch(() => {}));

    if (query.toLowerCase() !== "list" && !user) {
      return message.reply("no user");
    }

    switch (query.toLowerCase()) {
      case "add":
        GuildModel.updateOne(
          { guildID: message.guild?.id },
          {
            $addToSet: {
              protected: user!.id,
            },
          }
        )
          .then((modified) => {
            console.log(modified);
          })
          .catch((e) => {
            console.log(e);
          });
        break;
      case "remove":
        GuildModel.updateOne(
          { guildID: message.guild?.id },
          {
            $pull: {
              protected: user!.id,
            },
          }
        )
          .then((modified) => {
            console.log(modified);
          })
          .catch((e) => {
            console.log(e);
          });
        break;
      case "list":
        let guild = await GuildModel.findOne({
          guildID: message.guild?.id,
        });

        let protectedUsers = guild?.protected;

        console.log(protectedUsers);

        break;
      default:
        message.reply("invalid query");
        break;
    }
  },
  cooldown: 10,
  aliases: [],
  permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
