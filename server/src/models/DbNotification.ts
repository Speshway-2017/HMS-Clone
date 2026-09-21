import { Schema, model, InferSchemaType, Types } from "mongoose";

const dbNotificationSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["admission_request", "appointment", "inventory", "invoice", "general"], default: "general" },
    link: { type: String, default: "" },
    severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
    recipientRole: { type: String, required: true },
    recipientDoctor: { type: Schema.Types.ObjectId, ref: "Doctor", default: null },
    recipientPatient: { type: Schema.Types.ObjectId, ref: "Patient", default: null },
    isRead: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// Performance: Indexes
dbNotificationSchema.index({ hospital: 1, branch: 1, recipientRole: 1, isRead: 1 });
dbNotificationSchema.index({ hospital: 1, branch: 1, recipientDoctor: 1, isRead: 1 });
dbNotificationSchema.index({ hospital: 1, branch: 1, createdAt: -1 });

export type DbNotification = InferSchemaType<typeof dbNotificationSchema> & { _id: Types.ObjectId };
export const DbNotification = model("DbNotification", dbNotificationSchema);
