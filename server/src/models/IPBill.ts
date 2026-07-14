import { Schema, model, InferSchemaType, Types } from "mongoose";

const ipBillSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    admission: { type: Schema.Types.ObjectId, ref: "Admission", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    billNumber: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, default: null, unique: true, sparse: true },
    billingDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["Draft", "Generated", "Paid", "Cancelled"],
      default: "Draft"
    },
    taxRate: { type: Number, default: 5 },
    discountType: { type: String, enum: ["percentage", "fixed"], default: "fixed" },
    hospitalDiscount: { type: Number, default: 0 },
    doctorDiscount: { type: Number, default: 0 },
    managementDiscount: { type: Number, default: 0 },
    insuranceCovered: { type: Number, default: 0 },
    approvedAmount: { type: Number, default: 0 },
    claimAmount: { type: Number, default: 0 },
    patientShare: { type: Number, default: 0 },
    advancePaid: { type: Number, default: 0 },
    paymentMode: { type: String, default: "Cash" },
    outstanding: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export type IPBill = InferSchemaType<typeof ipBillSchema> & { _id: Types.ObjectId };
export const IPBill = model("IPBill", ipBillSchema);
