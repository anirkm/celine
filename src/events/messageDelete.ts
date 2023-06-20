import { type Client, type Message } from "discord.js";
import { BotEvent } from "../types";

const event: BotEvent = {
  name: "messageDelete",
  once: false,
  execute: async (client: Client, message: Message) => {
    if (!message.author.bot) {
      client.randomRedis.lrange(`snipe:${message.guild?.id}:${message.channel.id}`, 0, -1, (err, messages) => {
        if (err) {
          console.error("Redis Error: snipe", err);
          return;
        }

        const simplifiedMessage = {
          content: message.content,
          author: message.author.id,
          createdAt: message.createdTimestamp,
        };

        const messageJson = JSON.stringify(simplifiedMessage);
        client.randomRedis.lpush(`snipe:${message.guild?.id}:${message.channel.id}`, messageJson, (err) => {
          if (err) console.error("Redis Error:", err);
          client.randomRedis.ltrim(`snipe:${message.guild?.id}:${message.channel.id}`, 0, 9);
        });
      });
    }
  },
};

export default event;
