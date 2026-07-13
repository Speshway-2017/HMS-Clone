import { Schema, model, InferSchemaType, Types } from "mongoose";

const prescriptionAuditLogSchema = new Schema(
  {
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    prescription: { type: Schema.Types.ObjectId, ref: "Prescription", required: true },
    createdTime: { type: Date, default: null },
    viewedTime: { type: Date, default: null },
    dispensedTime: { type: Date, default: null },
    downloadedTime: { type: Date, default: null },
    downloadedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export type PrescriptionAuditLog = InferSchemaType<typeof prescriptionAuditLogSchema> & {
  _id: Types.ObjectId;
};
export const PrescriptionAuditLog = model("PrescriptionAuditLog", prescriptionAuditLogSchema);
