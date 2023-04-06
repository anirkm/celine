import { model, Schema } from "mongoose";
import { IGuild } from "../types";

const GuildSchema = new Schema<IGuild>({
  guildID: { required: true, type: String, unique: true },
  options: {
    prefix: { type: String, default: process.env.PREFIX },
    muteRole: { type: String },
    jailRole: { type: String },
  },
  protected: { type: [], default: [] },
  userPermissions: { type: [], default: [] },
  rolePermissions: { type: [], default: [] },
  rolePersist: { type: [], default: [] },
});

GuildSchema.index({ guildID: 1 });
GuildSchema.index({ "userPermissions.userId": 1 });
GuildSchema.index({ "rolePermissions.roleId": 1 });

const GuildModel = model("guild", GuildSchema);

export default GuildModel;
