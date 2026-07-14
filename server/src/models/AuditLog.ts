import { Schema, model, InferSchemaType, Types } from "mongoose";

const auditLogSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    ipAddress: { type: String, default: "" },

    // ── Resource tracking (additive — existing logs have these null) ──────
    resource: { type: String, default: null },          // e.g. "department"
    resourceId: { type: Schema.Types.ObjectId, default: null }, // affected doc _id
    oldValues: { type: Schema.Types.Mixed, default: null },     // snapshot before edit
    newValues: { type: Schema.Types.Mixed, default: null },     // snapshot after edit
  },
  { timestamps: true },
);

export type AuditLog = InferSchemaType<typeof auditLogSchema> & { _id: Types.ObjectId };
export const AuditLog = model("AuditLog", auditLogSchema);
