import { Schema, model, InferSchemaType, Types } from "mongoose";

const labOrderSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
    tokenNumber: { type: String, default: "" },
    tests: { type: [String], required: true },
    priority: { type: String, enum: ["Routine", "Urgent", "STAT"], default: "Routine" },
    sampleStatus: { type: String, enum: ["Pending", "Collected", "Processing", "Completed", "Rejected"], default: "Pending" },
    sampleDetails: {
      sampleId: { type: String, default: "" },
      sampleType: { type: String, default: "Blood" },
      collectedBy: { type: String, default: "" },
      collectedAt: { type: Date, default: null },
      remarks: { type: String, default: "" },
    },
    results: [
      {
        testName: { type: String, required: true },
        value: { type: String, default: "" },
        unit: { type: String, default: "" },
        referenceRange: { type: String, default: "" },
        flag: { type: String, enum: ["Normal", "High", "Low", "Critical", "Pending"], default: "Pending" },
        status: { type: String, default: "pending" },
      },
    ],
    attachments: [
      {
        name: { type: String, default: "" },
        url: { type: String, default: "" },
        fileType: { type: String, default: "application/pdf" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: { 
      type: String, 
      enum: ["Pending", "Sample Collection", "Processing", "Quality Check", "Completed", "Cancelled", "pending", "accepted", "processing", "report_uploaded", "verified", "completed", "rejected"], 
      default: "Pending" 
    },
    rejectionReason: { type: String, default: "" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Performance: compound indexes for doctor-scoped, patient-scoped, and branch-scoped queries
labOrderSchema.index({ hospital: 1, doctor: 1, status: 1 });
labOrderSchema.index({ hospital: 1, patient: 1 });
labOrderSchema.index({ hospital: 1, doctor: 1, createdAt: -1 });
labOrderSchema.index({ hospital: 1, branch: 1, status: 1 });
labOrderSchema.index({ hospital: 1, branch: 1, createdAt: -1 });

export type LabOrder = InferSchemaType<typeof labOrderSchema> & { _id: Types.ObjectId };
export const LabOrder = model("LabOrder", labOrderSchema);
