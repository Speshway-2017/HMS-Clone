import { Schema, model, InferSchemaType, Types } from "mongoose";

const auditLogSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", default: null },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    userEmail: { type: String, default: "" },
    userRole: { type: String, default: "system" },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, default: "" },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

auditLogSchema.index({ hospital: 1, timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema> & { _id: Types.ObjectId };
export const AuditLog = model("AuditLog", auditLogSchema);
