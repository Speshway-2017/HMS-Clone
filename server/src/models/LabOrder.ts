import { Schema, model, InferSchemaType, Types } from "mongoose";

const labOrderSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    tests: { type: [String], required: true },
    priority: { type: String, enum: ["Routine", "Urgent", "STAT"], default: "Routine" },
    sampleStatus: { type: String, enum: ["Pending", "Collected", "Processing", "Completed", "Rejected"], default: "Pending" },
    results: [
      {
        testName: { type: String, required: true },
        value: { type: String, required: true },
        referenceRange: { type: String, default: "" },
        status: { type: String, enum: ["normal", "elevated", "high", "low", "borderline", "pending"], default: "pending" },
      },
    ],
    status: { type: String, enum: ["pending", "completed", "rejected"], default: "pending" },
    rejectionReason: { type: String, default: "" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type LabOrder = InferSchemaType<typeof labOrderSchema> & { _id: Types.ObjectId };
export const LabOrder = model("LabOrder", labOrderSchema);
