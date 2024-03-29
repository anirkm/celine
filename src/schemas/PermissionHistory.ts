import { model, Schema } from "mongoose";
import { PermissionHistory } from "../types";

const PermissionHistorySchema = new Schema<PermissionHistory>(
  {
    guildId: { required: true, type: String },
    targetType: { required: true, type: String },
    targetId: { required: true, type: String },
    changedBy: { required: true, type: String },
    previousPermissions: { required: true, type: [String] },
    currentPermissions: { required: true, type: [String] },
  },
  {
    timestamps: true,
  },
);

const PermissionHistoryModel = model<PermissionHistory>(
  "PermissionHistory",
  PermissionHistorySchema,
);

export default PermissionHistoryModel;
