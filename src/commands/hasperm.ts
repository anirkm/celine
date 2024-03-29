import { PermissionFlagsBits } from "discord.js";
import { Command } from "../types";

import { hasPermission } from "../functions";

const command: Command = {
  name: "hasperm",
  execute: async (client, message, args) => {
    let user =
      message.mentions.members?.first() ||
      (await message.guild?.members
        .fetch({ user: args[1], force: true })
        .catch(() => {}));

    let perm = args[2];

    if (!user) return message.reply({ content: "user not found" });

    let start = Date.now();
    await hasPermission(client, user!, perm).then((result) => {
      let finish = Date.now() - start;
      message.reply({
        content: `result: ${result} - took ${finish.toFixed(2) + "ms"} to fetch the perm`,
      });
    });
  },
  cooldown: 10,
  aliases: [],
  permissions: [PermissionFlagsBits.KickMembers],
};

export default command;
