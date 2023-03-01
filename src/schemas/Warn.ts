import { model, Schema } from "mongoose";
import { IWarn } from "../types";

const WarnSchema = new Schema<IWarn>({
  warnID: { required: true, type: String },
  guildID: { required: true, type: String },
  modID: { required: true, type: String },
  userID: { required: true, type: String },
  reason: { required: true, type: String },
  startAt: { required: false, type: Date, default: new Date() },
});

const WarnModel = model("warn", WarnSchema);

export default WarnModel;
