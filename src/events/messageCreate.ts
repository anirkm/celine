import { ChannelType, Client, Message, PermissionFlagsBits } from "discord.js";
import mongoose from "mongoose";
import {
  checkPermissions,
  getGuildOption,
  sendTimedMessage,
} from "../functions";
import { BotEvent } from "../types";
import { countMsg, setLastMsgTimestamp } from "../utils/msgUtils";

const event: BotEvent = {
  name: "messageCreate",
  execute: async (client: Client, message: Message) => {
    if (!message.member || message.member.user.bot) return;
    if (!message.guild) return;

    countMsg(client, message.guild, message.member);
    setLastMsgTimestamp(client, message.guild, message.member);

    let prefix = process.env.PREFIX;
    if (mongoose.connection.readyState === 1) {
      let guildPrefix = await getGuildOption(message.guild, "prefix");
      if (guildPrefix) prefix = guildPrefix;
    }

    if (!message.content.startsWith(prefix)) return;
    if (message.channel.type !== ChannelType.GuildText) return;

    let args = message.content
      .substring(prefix.length)
      .split(" ")
      .filter((e: string) => String(e).trim());

    let command = message.client.commands.get(args[0]);

    if (!command) {
      let commandFromAlias = message.client.commands.find((command) =>
        command.aliases.includes(args[0])
      );
      if (commandFromAlias) command = commandFromAlias;
      else return;
    }

    let cooldown = message.client.cooldowns.get(
      `${command.name}-${message.member.user.username}`
    );
    let neededPermissions = checkPermissions(
      message.member,
      command.permissions
    );
    if (neededPermissions !== null) return;

    if (
      command.cooldown &&
      cooldown &&
      !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      if (Date.now() < cooldown) {
        sendTimedMessage(
          `You have to wait ${Math.floor(
            Math.abs(Date.now() - cooldown) / 1000
          )} second(s) to use this command again.`,
          message.channel,
          5000
        );
        return;
      }
      message.client.cooldowns.set(
        `${command.name}-${message.member.user.username}`,
        Date.now() + command.cooldown * 1000
      );
      setTimeout(() => {
        message.client.cooldowns.delete(
          `${command?.name}-${message.member?.user.username}`
        );
      }, command.cooldown * 1000);
    } else if (command.cooldown && !cooldown) {
      message.client.cooldowns.set(
        `${command.name}-${message.member.user.username}`,
        Date.now() + command.cooldown * 1000
      );
    }

    command.execute(client, message, args);
  },
};

export default event;
