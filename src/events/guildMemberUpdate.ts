import { Client, GuildMember } from "discord.js";
import GuildModel from "../schemas/Guild";
import { BotEvent } from "../types";
const event: BotEvent = {
  name: "guildMemberUpdate",
  once: false,
  execute: async (
    client: Client,
    oldMember: GuildMember,
    newMember: GuildMember,
  ) => {
    const guild = await GuildModel.findOne({
      guildID: newMember.guild.id,
    }).catch(console.log);
    if (!guild) return;

    const roleRemovals = new Map(
      [...oldMember.roles.cache].filter(
        ([role]) => !newMember.roles.cache.has(role),
      ),
    );

    const roleAdditions = new Map(
      [...newMember.roles.cache].filter(([roleId, role]) => {
        if (role.managed && role.tags?.premiumSubscriberRole) {
          return false;
        }
        return !oldMember.roles.cache.has(roleId);
      }),
    );

    if (roleAdditions.size !== 0) {
      if (newMember.roles.cache.has(guild.options.jailRole)) {
        newMember.roles
          .remove(
            Array.from(roleAdditions.keys()).filter(
              (roleId) => roleId !== guild.options.jailRole,
            ),
          )
          .catch(console.log);
      }
    }

    if (roleRemovals.size !== 0) {
      const redisKeys = {
        [guild.options.muteRole]:
          `mutequeue_${newMember.guild.id}_${newMember.id}`,
        [guild.options.jailRole]:
          `jailqueue_${newMember.guild.id}_${newMember.id}`,
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
