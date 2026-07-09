import { Schema, model, InferSchemaType, Types } from "mongoose";

export const REPORT_TYPES = ["hospitals", "branches", "departments", "admins"] as const;

const reportSchema = new Schema(
  {
    type: { type: String, enum: REPORT_TYPES, required: true },
    format: { type: String, default: "csv" },
    rowCount: { type: Number, default: 0 },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", default: null },
  },
  { timestamps: true },
);

export type Report = InferSchemaType<typeof reportSchema> & { _id: Types.ObjectId };
export const Report = model("Report", reportSchema);
