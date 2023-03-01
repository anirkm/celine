import { Client, GuildMember } from "discord.js";
import GuildJoinModel from "../schemas/GuildJoin";

import InvitesTracker from "@androz2091/discord-invites-tracker";
import { IGuildJoin } from "../types";

type JoinType = "permissions" | "normal" | "vanity" | "unknown";

module.exports = (client: Client) => {
  const tracker = InvitesTracker.init(client, {
    fetchGuilds: true,
    fetchVanity: true,
    fetchAuditLogs: true,
  });
  tracker.on(
    "guildMemberAdd",
    async (member: GuildMember, type: JoinType, invite: any) => {
      let guildJoin: IGuildJoin;

      console.log(member.id, type, invite);

      if (type === "normal") {
        guildJoin = new GuildJoinModel({
          guildId: member.guild.id,
          userId: member.id,
          timestamp: new Date().getTime(),
          type: type,
          inviteId: invite.code,
          invitedBy: invite.inviter.id,
        });
      } else {
        guildJoin = new GuildJoinModel({
          guildId: member.guild.id,
          userId: member.id,
          timestamp: new Date().getTime(),
          type: type,
        });
      }

      await guildJoin.save().catch((e) => {
        console.log("couldn't save new join", e);
      });
    }
  );
};
