import crypto from "crypto";
import { model, Schema } from "mongoose";
import { ISanction } from "../types";

const generateUniqueId = (n: number): string => {
  return crypto.randomBytes(n).toString("hex");
};

const SanctionSchema = new Schema<ISanction>({
  sanctionId: {
    type: String,
    unique: true,
    default: function () {
      return crypto.randomBytes(8).toString("hex");
    },
  },
  guildID: { required: true, type: String },
  modID: { required: true, type: String },
  userID: { required: true, type: String },
  type: { required: true, type: String },
  duration: { required: false, type: String },
  reason: { required: true, type: String },
  startAt: { required: true, type: Date },
});

// Single-field indexes
SanctionSchema.index({ guildID: 1 });
SanctionSchema.index({ modID: 1 });
SanctionSchema.index({ userID: 1 });

// Compound index
SanctionSchema.index({ guildID: 1, userID: 1 });

const SanctionModel = model("sanction", SanctionSchema);

export default SanctionModel;
