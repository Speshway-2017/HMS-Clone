import { Schema, model, InferSchemaType, Types } from "mongoose";

const paymentSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["UPI", "Cash", "Card", "Net Banking", "Cheque", "Mixed"], required: true },
    mixedDetails: {
      upiAmount: { type: Number, default: 0 },
      cashAmount: { type: Number, default: 0 },
      cardAmount: { type: Number, default: 0 },
    },
    transactionId: { type: String, required: true },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type Payment = InferSchemaType<typeof paymentSchema> & { _id: Types.ObjectId };
export const Payment = model("Payment", paymentSchema);
