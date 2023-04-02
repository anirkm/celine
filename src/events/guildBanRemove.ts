import { Client, GuildBan } from "discord.js";
import { BotEvent } from "../types";

const event: BotEvent = {
  name: "guildBanRemove",
  once: false,
  execute: async (client: Client, ban: GuildBan) => {
    if (await client.redis.exists(`banqueue_${ban.guild.id}_${ban.user.id}`))
      client.redis
        .del(`banqueue_${ban.guild.id}_${ban.user.id}`)
        .catch(() => {})
        .catch((e) => console.log(`err deleting queue unban`, e));
  },
};

export default event;
