import { Schema, model, InferSchemaType, Types } from "mongoose";

const auditLogSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", default: null },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    userEmail: { type: String, default: "" },
    userRole: { type: String, default: "system" },
    action: { type: String, required: true },
    entity: { type: String, required: true, default: "system" },
    entityId: { type: String, default: "" },
    resource: { type: String, default: "" },
    resourceId: { type: Schema.Types.Mixed, default: null },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

auditLogSchema.pre("validate", function (next) {
  if (!this.entity || this.entity === "system") {
    if (this.resource) {
      this.entity = String(this.resource);
    } else {
      this.entity = "system";
    }
  }
  if (!this.entityId && this.resourceId) {
    this.entityId = String(this.resourceId);
  }
  next();
});

auditLogSchema.index({ hospital: 1, branch: 1, timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema> & { _id: Types.ObjectId };
export const AuditLog = model("AuditLog", auditLogSchema);
