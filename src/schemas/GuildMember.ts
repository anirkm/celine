import { Schema, model } from "mongoose";
import { IGuildMember } from "../types";

const GuildMemberSchema = new Schema<IGuildMember>({
  userID: { required: true, type: String },
  guildID: { required: true, type: String },
  permissions: { default: [] },
});

const GuildMemberModel = model("guildMember", GuildMemberSchema);

export default GuildMemberModel;
