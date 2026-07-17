import { Schema, model, InferSchemaType, Types } from "mongoose";

const labOrderSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
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
    status: { 
      type: String, 
      enum: ["pending", "accepted", "processing", "report_uploaded", "verified", "completed", "rejected"], 
      default: "pending" 
    },
    rejectionReason: { type: String, default: "" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Performance: compound indexes for doctor-scoped and patient-scoped queries
labOrderSchema.index({ hospital: 1, doctor: 1, status: 1 });
labOrderSchema.index({ hospital: 1, patient: 1 });
labOrderSchema.index({ hospital: 1, doctor: 1, createdAt: -1 });

export type LabOrder = InferSchemaType<typeof labOrderSchema> & { _id: Types.ObjectId };
export const LabOrder = model("LabOrder", labOrderSchema);
