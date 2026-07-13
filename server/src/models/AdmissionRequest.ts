import { Schema, model, InferSchemaType, Types } from "mongoose";

const admissionRequestSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    requestNumber: { type: String, required: true, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
    consultation: { type: Schema.Types.ObjectId, ref: "OPVisit", default: null },
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    priority: { type: String, enum: ["Routine", "Urgent", "Emergency"], default: "Routine" },
    preferredWard: { type: String, default: "" },
    preferredBedType: { type: String, default: "" },
    expectedStay: { type: String, default: "" },
    diagnosis: { type: String, required: true },
    notes: { type: String, default: "" },
    specialInstructions: { type: String, default: "" },
    requestedAt: { type: Date, default: Date.now },
    requestedBy: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

// Add required indexes
admissionRequestSchema.index({ hospital: 1 });
admissionRequestSchema.index({ status: 1 });
admissionRequestSchema.index({ patient: 1 });
admissionRequestSchema.index({ doctor: 1 });
admissionRequestSchema.index({ requestedAt: -1 });

// Composite index to prevent duplicate pending admission requests for the same patient in a hospital
admissionRequestSchema.index(
  { hospital: 1, patient: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "Pending" } }
);

export type AdmissionRequest = InferSchemaType<typeof admissionRequestSchema> & { _id: Types.ObjectId };
export const AdmissionRequest = model("AdmissionRequest", admissionRequestSchema);
