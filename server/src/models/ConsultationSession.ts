import { Schema, model, InferSchemaType, Types } from "mongoose";

const draftMedicationSchema = new Schema({
  name: { type: String, required: true },
  strength: { type: String, default: "" },
  dosage: { type: String, default: "" },
  frequency: { type: String, default: "" },
  duration: { type: String, default: "" },
  instructions: { type: String, default: "" },
  morning: { type: Boolean, default: false },
  afternoon: { type: Boolean, default: false },
  night: { type: Boolean, default: false },
});

const consultationSessionSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "IN_PROGRESS",
    },
    
    // Draft Vitals
    vitals: {
      temperature: { type: String, default: "" },
      bloodPressure: { type: String, default: "" },
      pulseRate: { type: String, default: "" },
      respiratoryRate: { type: String, default: "" },
      oxygenSaturation: { type: String, default: "" },
      weight: { type: String, default: "" },
    },
    
    // Draft Clinical Assessment
    chiefComplaint: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    symptoms: { type: String, default: "" },
    clinicalNotes: { type: String, default: "" },
    treatmentPlan: { type: String, default: "" },
    advice: { type: String, default: "" },
    
    // Draft Prescription Medications
    prescriptions: [draftMedicationSchema],
    
    // Draft Lab Orders (tests)
    labOrders: [{ type: String }],
    
    // Draft Radiology Orders
    radiologyOrders: [
      {
        type: { type: String },
        notes: { type: String },
        priority: { type: String, default: "Routine" },
      },
    ],
    
    // Draft Admission Recommendation
    admissionRecommendation: {
      priority: { type: String, enum: ["Routine", "Urgent", "Emergency"], default: "Routine" },
      preferredWard: { type: String, default: "General" },
      preferredBedType: { type: String, default: "General" },
      expectedStay: { type: String, default: "" },
      primaryDiagnosis: { type: String, default: "" },
      clinicalNotes: { type: String, default: "" },
      admissionReason: { type: String, default: "" },
      specialInstructions: { type: String, default: "" },
      recommended: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export type ConsultationSession = InferSchemaType<typeof consultationSessionSchema> & { _id: Types.ObjectId };
export const ConsultationSession = model("ConsultationSession", consultationSessionSchema);
