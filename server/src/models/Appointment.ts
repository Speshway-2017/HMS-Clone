import { Schema, model, InferSchemaType, Types } from "mongoose";

export const APPOINTMENT_TYPES = [
  "Appointment",
  "Walk-in",
  "Emergency",
] as const;

export const APPOINTMENT_STATUSES = [
  "pending_payment",
  "scheduled",
  "checked_in",
  "waiting",
  "in_consultation",
  "completed",
  "cancelled",
  "no_show",
  "missed",
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
    type: { 
      type: String, 
      enum: APPOINTMENT_TYPES, 
      default: "Appointment" 
    },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: "scheduled" },
    notes: { type: String, default: "" },
    chiefComplaint: { type: String, default: "" },
    symptoms: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    clinicalNotes: { type: String, default: "" },
    treatmentPlan: { type: String, default: "" },
    advice: { type: String, default: "" },
    cancellationReason: { type: String, default: "" },
    cancellationRemarks: { type: String, default: "" },
    refundRequired: { type: Boolean, default: false },
    rescheduleHistory: [
      {
        oldDate: { type: Date, required: true },
        oldTime: { type: String, required: true },
        newDate: { type: Date, required: true },
        newTime: { type: String, required: true },
        oldToken: { type: String, required: true },
        newToken: { type: String, required: true },
        rescheduledBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        reason: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    // Reschedule tracking fields
    isRescheduled: { type: Boolean, default: false },
    rescheduleCount: { type: Number, default: 0 },
    previousAppointmentDate: { type: Date, default: null },
    previousAppointmentTime: { type: String, default: "" },
    newAppointmentDate: { type: Date, default: null },
    newAppointmentTime: { type: String, default: "" },

    // Follow-up visit fields
    followUp: { type: Boolean, default: false },
    parentAppointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
    followUpDate: { type: Date, default: null },
    followUpReason: { type: String, default: "" },


    // Billing status fields for free revisit consultations
    billingStatus: { type: String, default: "Pending" },
    billingReason: { type: String, default: "" },

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
