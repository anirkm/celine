import { Client, GuildMember } from "discord.js";
import { BotEvent } from "../types";
import GuildModel from "../schemas/Guild";

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

    for (const { keyPrefix, roleId } of roleTypes) {
      const redisKey = `${keyPrefix}_${member.guild.id}_${member.id}`;
      if (await client.redis.exists(redisKey)) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
          member.roles.add(role).catch(console.error);
        }
      }
    }

    const tempRoleKeys = await client.redis.keys(
      `tr_${member.guild.id}_${member.id}_*`
    );
    for (const tempRoleKey of tempRoleKeys) {
      const tempRoleId = tempRoleKey.split("_")[3];
      const tempRole = member.guild.roles.cache.get(tempRoleId);
      if (tempRole) {
        member.roles.add(tempRole).catch(console.error);
      }
    }
  },
};

export default event;
