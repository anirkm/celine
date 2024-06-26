import { Client, GuildMember } from "discord.js";
import GuildModel from "../schemas/Guild";
import { BotEvent } from "../types";

const event: BotEvent = {
  name: "guildMemberAdd",
  once: false,
  execute: async (client: Client, member: GuildMember) => {
    const guild = await GuildModel.findOne({ guildID: member.guild.id });
    if (!guild) return;

    const roleTypes = [
      { keyPrefix: "mutequeue", roleId: guild.options.muteRole },
      { keyPrefix: "jailqueue", roleId: guild.options.jailRole },
    ];

    const staticPersistance = [
      { keyPrefix: "jail", roleId: guild.options.jailRole },
    ];

    for (const { keyPrefix, roleId } of staticPersistance) {
      const redisKey = `${keyPrefix}_${member.guild.id}_${member.id}`;
      if (await client.persistanceRedis.exists(redisKey)) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
          member.roles.add(role).catch(console.error);
        }
      }
    }

    for (const { keyPrefix, roleId } of roleTypes) {
      const redisKey = `${keyPrefix}_${member.guild.id}_${member.id}`;
      if (await client.redis.exists(redisKey)) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
          member.roles.add(role).catch(console.error);
        }
      }
    }
  },
};

export default event;
