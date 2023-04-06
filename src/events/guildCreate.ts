import { Client, Guild } from "discord.js";
import GuildModel from "../schemas/Guild";
import { BotEvent } from "../types";

const event: BotEvent = {
  name: "guildCreate",
  execute: (client: Client, guild: Guild) => {
    console.log("new guild");
    let newGuild = new GuildModel({
      guildID: guild.id,
      options: {},
    });
    newGuild.save();
  },
};

export default event;
