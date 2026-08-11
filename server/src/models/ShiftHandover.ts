import { Schema, model, InferSchemaType, Types } from "mongoose";

const patientHandoverItemSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: "Patient" },
  patientName: { type: String, default: "" },
  uhid: { type: String, default: "" },
  ward: { type: String, default: "" },
  bedNumber: { type: String, default: "" },
  diagnosis: { type: String, default: "" },
  condition: { type: String, default: "Stable" }, // Stable, Critical, Guarded, Improving
  vitalsSummary: { type: String, default: "" },
  medicationsGiven: { type: String, default: "" },
  pendingMedications: { type: String, default: "" },
  pendingLabTests: { type: String, default: "" },
  ivFluids: { type: String, default: "" },
  doctorInstructions: { type: String, default: "" },
  nursingNotes: { type: String, default: "" },
  specialAlerts: { type: String, default: "" },
  isHandedOver: { type: Boolean, default: true }
});

const shiftHandoverSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    currentShift: { type: String, required: true }, // Morning, Evening, Night
    nextShift: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Submitted", "Accepted", "Completed"],
      default: "Submitted"
    },
    patientsHandedOverCount: { type: Number, default: 0 },
    patientsHandedOverDetails: { type: String, default: "" },
    patientHandoverItems: [patientHandoverItemSchema],
    pendingMedication: { type: String, default: "" },
    pendingProcedures: { type: String, default: "" },
    criticalPatients: { type: String, default: "" },
    specialInstructions: { type: String, default: "" },
    remarks: { type: String, default: "" },
    handoverNotesChips: [{ type: String }],
    nurseSignature: { type: String, required: true },
    isVerified: { type: Boolean, default: true },
    loggedBy: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    loggedByName: { type: String, required: true },
    incomingNurse: { type: Schema.Types.ObjectId, ref: "Staff" },
    incomingNurseName: { type: String, default: "" },
    acceptedBy: { type: Schema.Types.ObjectId, ref: "Staff" },
    acceptedByName: { type: String, default: "" },
    acceptedAt: { type: Date },
    ipAddress: { type: String, default: "" },
    deviceInfo: { type: String, default: "" },
    supervisorAlertSent: { type: Boolean, default: false },
    overdueCount: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

shiftHandoverSchema.index({ hospital: 1, timestamp: -1 });
shiftHandoverSchema.index({ hospital: 1, status: 1 });
shiftHandoverSchema.index({ incomingNurse: 1, status: 1 });

export type ShiftHandover = InferSchemaType<typeof shiftHandoverSchema> & { _id: Types.ObjectId };
export const ShiftHandover = model("ShiftHandover", shiftHandoverSchema);
