import { Schema, model, InferSchemaType, Types } from "mongoose";

const expenseSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    category: {
      type: String,
      enum: ["Utilities", "Rent/Lease", "Medical Supplies", "Equipment Maintenance", "Salaries", "Admin Expenses", "Vendor Payments"],
      required: true,
    },
    amount: { type: Number, required: true },
    recipient: { type: String, required: true },
    date: { type: String, required: true }, // Store YYYY-MM-DD
    description: { type: String, default: "" },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Bank Transfer", "Cash", "Card"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Paid", "Pending Approval"],
      default: "Paid",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export type Expense = InferSchemaType<typeof expenseSchema> & { _id: Types.ObjectId };
export const Expense = model("Expense", expenseSchema);
