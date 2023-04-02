import { Client, GuildMember } from "discord.js";
import GuildModel from "../schemas/Guild";
import { BotEvent } from "../types";
const event: BotEvent = {
  name: "guildMemberUpdate",
  once: false,
  execute: async (
    client: Client,
    oldMember: GuildMember,
    newMember: GuildMember
  ) => {
    const roleRemovals = new Map(
      [...oldMember.roles.cache].filter(
        ([role]) => !newMember.roles.cache.has(role)
      )
    );

    if (roleRemovals.size !== 0) {
      const guild = await GuildModel.findOne({
        guildID: newMember.guild.id,
      }).catch(console.log);
      if (!guild) return;

      const redisKeys = {
        [guild.options
          .muteRole]: `mutequeue_${newMember.guild.id}_${newMember.id}`,
        [guild.options
          .jailRole]: `jailqueue_${newMember.guild.id}_${newMember.id}`,
      };

      for (const roleId of roleRemovals.keys()) {
        const defaultKey = `tr_${newMember.guild.id}_${newMember.id}_${roleId}`;
        const redisKey = redisKeys[roleId] || defaultKey;

        if (await client.redis.exists(redisKey)) {
          client.redis.del(redisKey).catch(console.log);
        }
      }
    }
  },
};

export default event;
