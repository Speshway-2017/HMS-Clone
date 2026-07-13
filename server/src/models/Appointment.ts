import { Schema, model, InferSchemaType, Types } from "mongoose";

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "checked_in",
  "in_consultation",
  "completed",
  "cancelled",
  "no_show",
] as const;

const appointmentSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    referenceId: { type: String, required: true, unique: true, uppercase: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    type: { type: String, default: "Consultation" },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: "scheduled" },
    notes: { type: String, default: "" },
    chiefComplaint: { type: String, default: "" },
    symptoms: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    clinicalNotes: { type: String, default: "" },
    treatmentPlan: { type: String, default: "" },
    advice: { type: String, default: "" },
    vitals: {
      temperature: { type: String, default: "" },
      bloodPressure: { type: String, default: "" },
      pulseRate: { type: String, default: "" },
      respiratoryRate: { type: String, default: "" },
      oxygenSaturation: { type: String, default: "" },
      weight: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

export type Appointment = InferSchemaType<typeof appointmentSchema> & { _id: Types.ObjectId };
export const Appointment = model("Appointment", appointmentSchema);
