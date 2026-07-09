import { Schema, model, InferSchemaType, Types } from "mongoose";

export const DEPARTMENT_STATUSES = ["operational", "critical_load", "peak_hours", "inactive"] as const;

const departmentSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "general" },
    headName: { type: String, default: "" },
    totalBeds: { type: Number, default: 0 },
    doctors: { type: Number, default: 0 },
    nurses: { type: Number, default: 0 },
    support: { type: Number, default: 0 },
    services: { type: [String], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: DEPARTMENT_STATUSES, default: "operational" },
  },
  { timestamps: true },
);

export type Department = InferSchemaType<typeof departmentSchema> & { _id: Types.ObjectId };
export const Department = model("Department", departmentSchema);
