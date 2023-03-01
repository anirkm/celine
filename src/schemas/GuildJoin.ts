import { model, Schema } from "mongoose";
import { IGuildJoin } from "../types";

const GuildJoinSchema = new Schema<IGuildJoin>(
  {
    guildId: { required: true, type: String },
    userId: { required: true, type: String },
    timestamp: { required: true, type: Number, default: new Date().getTime() },
    type: { required: true, type: String },
    inviteId: { required: false, type: String },
    invitedBy: { required: false, type: String },
  },
  {
    timestamps: true,
  }
);

const GuildJoinModel = model("guildJoin", GuildJoinSchema);

export default GuildJoinModel;
