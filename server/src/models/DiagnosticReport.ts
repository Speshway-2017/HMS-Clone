import { Schema, model, InferSchemaType, Types } from "mongoose";

const fileSchema = new Schema({
  public_id: { type: String, required: true },
  secure_url: { type: String, required: true },
  original_filename: { type: String, required: true },
  mime_type: { type: String, required: true },
  file_size: { type: Number, required: true },
}, { _id: false });

const reportVersionSchema = new Schema({
  version: { type: Number, required: true },
  observations: { type: String, default: "" },
  remarks: { type: String, default: "" },
  files: [fileSchema],
  editedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  editedAt: { type: Date, default: Date.now }
}, { _id: false });

const diagnosticReportSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
    requestType: { type: String, enum: ["Laboratory", "Radiology"], required: true },
    requestId: { type: Schema.Types.ObjectId, required: true }, // reference to LabOrder or RadiologyOrder
    testName: { type: String, required: true },
    observations: { type: String, default: "" },
    remarks: { type: String, default: "" },
    files: [fileSchema],
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["report_uploaded", "verified", "completed"], default: "report_uploaded" },
    version: { type: Number, default: 1 },
    versions: [reportVersionSchema]
  },
  { timestamps: true }
);

diagnosticReportSchema.index({ hospital: 1, appointment: 1 });
diagnosticReportSchema.index({ hospital: 1, patient: 1 });
diagnosticReportSchema.index({ hospital: 1, requestId: 1 });

export type DiagnosticReport = InferSchemaType<typeof diagnosticReportSchema> & { _id: Types.ObjectId };
export const DiagnosticReport = model("DiagnosticReport", diagnosticReportSchema);
