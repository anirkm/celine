import { Client, Message } from "discord.js";
import mongoose from "mongoose";
import { getGuildOption } from "../functions";
import { BotEvent } from "../types";

const event: BotEvent = {
  name: "messageCreate",
  execute: async (client: Client, message: Message) => {
    if (!message.member || message.member.user.bot) return;
    if (!message.guild) return;

    let prefix = process.env.PREFIX;
    if (mongoose.connection.readyState === 1) {
      let guildPrefix = await getGuildOption(message.guild, "prefix");
      if (guildPrefix) prefix = guildPrefix;
    }

    if (!message.content.startsWith(prefix)) return;

    let args = message.content
      .substring(prefix.length)
      .split(" ")
      .filter((e: string) => String(e).trim());

    if (!args[0]) return;
    let command = message.client.commands.get(args[0].toLowerCase());

    if (!command) {
      let commandFromAlias = message.client.commands.find((command) =>
        command.aliases.includes(args[0]),
      );
      if (commandFromAlias) command = commandFromAlias;
      else return;
    }

    command.execute(client, message, args);
  },
};

export default event;
