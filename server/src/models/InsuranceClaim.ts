import { Schema, model, InferSchemaType, Types } from "mongoose";

const insuranceClaimSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    patientName: { type: String, required: true },
    patientPhone: { type: String, required: true },
    insuranceProvider: { type: String, required: true },
    policyNumber: { type: String, required: true },
    invoiceId: { type: String, required: true },
    claimAmount: { type: Number, required: true },
    approvedAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Pending Verification", "Approved", "Rejected", "Settled"],
      default: "Pending Verification",
    },
    reimbursementStatus: { type: String, default: "" },
    notes: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type InsuranceClaim = InferSchemaType<typeof insuranceClaimSchema> & { _id: Types.ObjectId };
export const InsuranceClaim = model("InsuranceClaim", insuranceClaimSchema);
