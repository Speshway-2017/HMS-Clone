import { Schema, model, InferSchemaType, Types } from "mongoose";

const notificationQueueSchema = new Schema(
  {
    prescription: { type: Schema.Types.ObjectId, ref: "Prescription", required: true },
    type: { type: String, enum: ["sms", "whatsapp", "email"], required: true },
    recipient: { type: String, required: true },
    content: { type: String, required: true },
    emailSubject: { type: String, default: "" },
    pdfPath: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    lastAttempt: { type: Date, default: null },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

export type NotificationQueue = InferSchemaType<typeof notificationQueueSchema> & {
  _id: Types.ObjectId;
};
export const NotificationQueue = model("NotificationQueue", notificationQueueSchema);
