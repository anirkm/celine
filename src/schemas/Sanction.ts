import { Schema, model } from "mongoose";
import { ISanction } from "../types";

const SanctionSchema = new Schema<ISanction>({
  guildID: { required: true, type: String },
  modID: { required: true, type: String },
  userID: { required: true, type: String },
  type: { required: true, type: String },
  duration: { required: false, type: String },
  reason: { required: true, type: String },
  startAt: { required: true, type: Date },
});

const SanctionModel = model("sanction", SanctionSchema);

export default SanctionModel;
