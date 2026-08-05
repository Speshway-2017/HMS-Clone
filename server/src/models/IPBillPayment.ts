import { Schema, model, InferSchemaType, Types } from "mongoose";

const ipBillPaymentSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    bill: { type: Schema.Types.ObjectId, ref: "IPBill", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Cheque", "Insurance", "Mixed"],
      required: true
    },
    mixedDetails: {
      upiAmount: { type: Number, default: 0 },
      cashAmount: { type: Number, default: 0 },
      cardAmount: { type: Number, default: 0 },
      chequeAmount: { type: Number, default: 0 },
      insuranceAmount: { type: Number, default: 0 }
    },
    transactionId: { type: String, required: true },
    paidAt: { type: Date, default: Date.now },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export type IPBillPayment = InferSchemaType<typeof ipBillPaymentSchema> & { _id: Types.ObjectId };
export const IPBillPayment = model("IPBillPayment", ipBillPaymentSchema);
