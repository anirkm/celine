import { Client, GuildMember } from "discord.js";
import GuildModel from "../schemas/Guild";
import { BotEvent } from "../types";

const event: BotEvent = {
  name: "guildMemberRemove",
  once: false,
  execute: async (client: Client, member: GuildMember) => {
    const guild = await GuildModel.findOne({ guildID: member.guild.id });
    if (!guild) return;

    client.redis
      .keys(`tr_${member.guild.id}_${member.id}_*`)
      .then((keys) => {
        if (keys.length > 0) client.redis.del(keys).catch(console.log);
      })
      .catch(console.log);
  },
};

export default event;
