import { Schema, model, InferSchemaType, Types } from "mongoose";

const notificationDismissalSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notificationId: { type: String, required: true },
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
  },
  { timestamps: true }
);

notificationDismissalSchema.index({ user: 1, notificationId: 1 }, { unique: true });

export type NotificationDismissal = InferSchemaType<typeof notificationDismissalSchema> & { _id: Types.ObjectId };
export const NotificationDismissal = model("NotificationDismissal", notificationDismissalSchema);
