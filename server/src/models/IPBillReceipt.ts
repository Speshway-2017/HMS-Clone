import { Schema, model, InferSchemaType, Types } from "mongoose";

const ipBillReceiptSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    bill: { type: Schema.Types.ObjectId, ref: "IPBill", required: true },
    payment: { type: Schema.Types.ObjectId, ref: "IPBillPayment", required: true },
    receiptNumber: { type: String, required: true, unique: true },
    paymentDate: { type: Date, default: Date.now },
    collectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    paymentMode: { type: String, required: true },
    amount: { type: Number, required: true }
  },
  { timestamps: true }
);

export type IPBillReceipt = InferSchemaType<typeof ipBillReceiptSchema> & { _id: Types.ObjectId };
export const IPBillReceipt = model("IPBillReceipt", ipBillReceiptSchema);
