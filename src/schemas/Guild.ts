import { Schema, model } from "mongoose";
import { IGuild } from "../types";

const GuildSchema = new Schema<IGuild>({
  guildID: { required: true, type: String },
  options: {
    prefix: { type: String, default: process.env.PREFIX },
    muteRole: { type: String },
    jailRole: { type: String },
  },
  protected: { type: [], default: [] },
});

const GuildModel = model("guild", GuildSchema);

export default GuildModel;
