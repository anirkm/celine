import { GuildMember, Client } from "discord.js";
import { BotEvent, IGuildMember } from "../types";
import { logJoin } from "../utils/userUtils";
import GuildMemberModel from "../schemas/GuildMember";

const event: BotEvent = {
  name: "guildMemberAdd",
  execute: async (client: Client, member: GuildMember) => {
    let GuildMember = await GuildMemberModel.findOne({
      userID: member.id,
      guildID: member.guild.id,
    });

    if (!GuildMember) {
      let newGuildMember = new GuildMemberModel({
        userID: member.id,
        guildID: member.guild.id,
        permissions: [],
      });

      await newGuildMember
        .save()
        .then(async (GuildMember: IGuildMember) => {
          await logJoin(GuildMember);
        })
        .catch((e) => {
          console.log("couldnt save new member", e);
        });
    }
  },
};

export default event;
