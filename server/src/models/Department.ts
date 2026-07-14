import { Schema, model, InferSchemaType, Types } from "mongoose";

export const DEPARTMENT_STATUSES = [
  "operational",
  "critical_load",
  "peak_hours",
  "inactive",
  "under_maintenance",
  "temporarily_closed",
] as const;

const departmentSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },

    // ── Core identity ─────────────────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    specialization: { type: String, default: "" },
    category: { type: String, default: "general" },

    // ── Leadership ────────────────────────────────────────────────────────
    headName: { type: String, default: "" },
    departmentHead: { type: Schema.Types.ObjectId, ref: "Doctor", default: null },

    // ── Location ─────────────────────────────────────────────────────────
    location: { type: String, default: "" },
    floor: { type: String, default: "" },
    building: { type: String, default: "" },

    // ── Operations ────────────────────────────────────────────────────────
    totalBeds: { type: Number, default: 0 },
    occupiedBeds: { type: Number, default: 0 },
    doctors: { type: Number, default: 0 },
    nurses: { type: Number, default: 0 },
    support: { type: Number, default: 0 },
    services: { type: [String], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: DEPARTMENT_STATUSES, default: "operational" },

    // ── Extended details ──────────────────────────────────────────────────
    consultationFee: { type: Number, default: 0, min: 0 },
    isEmergency: { type: Boolean, default: false },
    colorTheme: { type: String, default: "" },
    displayOrder: { type: Number, default: 0 },

    // ── Soft-disable (never hard-delete if in use) ────────────────────────
    isDisabled: { type: Boolean, default: false },
    disabledAt: { type: Date, default: null },
    disabledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// Sparse unique index: code must be unique per hospital (skip empty strings)
departmentSchema.index(
  { hospital: 1, code: 1 },
  { unique: true, sparse: true, partialFilterExpression: { code: { $gt: "" } } },
);

export type Department = InferSchemaType<typeof departmentSchema> & { _id: Types.ObjectId };
export const Department = model("Department", departmentSchema);
