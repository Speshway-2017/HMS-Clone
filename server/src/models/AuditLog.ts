import { Schema, model, InferSchemaType, Types } from "mongoose";

const auditLogSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    ipAddress: { type: String, default: "" },
  },
  { timestamps: true }
);

export type AuditLog = InferSchemaType<typeof auditLogSchema> & { _id: Types.ObjectId };
export const AuditLog = model("AuditLog", auditLogSchema);
