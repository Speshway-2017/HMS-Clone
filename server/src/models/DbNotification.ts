import { Schema, model, InferSchemaType, Types } from "mongoose";

const dbNotificationSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["admission_request", "appointment", "inventory", "invoice", "general"], default: "general" },
    link: { type: String, default: "" },
    severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
    recipientRole: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export type DbNotification = InferSchemaType<typeof dbNotificationSchema> & { _id: Types.ObjectId };
export const DbNotification = model("DbNotification", dbNotificationSchema);
