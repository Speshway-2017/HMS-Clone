import { Schema, model, InferSchemaType, Types } from "mongoose";

export const PATIENT_STATUSES = ["admitted", "opd", "discharged"] as const;

const medicalHistoryEntrySchema = new Schema(
  {
    date: { type: Date, required: true },
    visitType: { type: String, default: "" },
    doctorName: { type: String, default: "" },
    department: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: { type: String, default: "Completed" },
  },
  { _id: true },
);

const patientSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    uhid: { type: String, unique: true, sparse: true },
    patientCode: { type: String, unique: true, sparse: true },
    qrCode: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    age: { type: Number, default: null },
    gender: { type: String, default: "" },
    bloodGroup: { type: String, default: "" },
    address: { type: String, default: "" },
    assignedDoctor: { type: Schema.Types.ObjectId, ref: "Doctor", default: null },
    status: { type: String, enum: PATIENT_STATUSES, default: "opd" },
    isActive: { type: Boolean, default: true },
    allergies: { type: String, default: "" },
    insuranceProvider: { type: String, default: "" },
    insurancePolicyNumber: { type: String, default: "" },
    emergencyContact: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      relation: { type: String, default: "" },
    },
    medicalHistory: { type: [medicalHistoryEntrySchema], default: [] },
  },
  { timestamps: true },
);


export type Patient = InferSchemaType<typeof patientSchema> & { _id: Types.ObjectId };
export const Patient = model("Patient", patientSchema);
