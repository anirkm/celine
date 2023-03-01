import { model, Schema } from "mongoose";
import { ISanctionQueue } from "../types";

const SanctionQueueSchema = new Schema<ISanctionQueue>({
  guildID: { required: true, type: String },
  userID: { required: true, type: String },
  type: { required: true, type: String },
  endAt: { required: true, type: Date },
});

const SanctionQueueModel = model("sanctionQueue", SanctionQueueSchema);

export default SanctionQueueModel;
