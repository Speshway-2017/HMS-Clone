import { Schema, model, InferSchemaType, Types } from "mongoose";

const prescriptionSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
    consultation: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
    admission: { type: Schema.Types.ObjectId, ref: "Admission", default: null },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    diagnosis: { type: String, default: "" },
    chiefComplaint: { type: String, default: "" },
    clinicalNotes: { type: String, default: "" },
    medications: [
      {
        name: { type: String, required: true },
        strength: { type: String, default: "" },
        dosage: { type: String, default: "" },
        frequency: { type: String, default: "" },
        duration: { type: String, default: "" },
        quantity: { type: Number, default: 1 },
        instructions: { type: String, default: "" },
        status: { type: String, default: "Pending" },
        prescribedAt: { type: Date, default: Date.now },
      },
    ],
    labOrders: [{ type: String }],
    radiologyOrders: [{ type: String }],
    advice: { type: String, default: "" },
    followUpDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Pending", "Preparing", "Ready for Pickup", "Partially Dispensed", "Dispensed", "Completed", "Cancelled"],
      default: "Pending",
    },
    dispensedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    dispensedByName: { type: String, default: "" },
    dispensedAt: { type: Date, default: null },
    dispensedItems: [
      {
        medicineName: { type: String, default: "" },
        batchNo: { type: String, default: "" },
        expiryDate: { type: String, default: "" },
        quantity: { type: Number, default: 0 },
        unitPrice: { type: Number, default: 0 },
      },
    ],
    deliveryStatus: {
      mobile: {
        type: String,
        enum: ["pending", "delivered", "failed"],
        default: "pending",
      },
      pharmacy: {
        type: String,
        enum: ["pending", "delivered", "failed"],
        default: "pending",
      },
    },
    prescriptionNumber: { type: String, unique: true, sparse: true },
    pdfUrl: { type: String, default: "" },
    downloadUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export type Prescription = InferSchemaType<typeof prescriptionSchema> & { _id: Types.ObjectId };
export const Prescription = model("Prescription", prescriptionSchema);
