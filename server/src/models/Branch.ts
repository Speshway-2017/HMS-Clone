import { Schema, model, InferSchemaType, Types } from "mongoose";

export const BRANCH_STATUSES = ["active", "on_leave", "critical", "inactive"] as const;

const branchSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
    name: { type: String, required: true, trim: true },
    branchId: { type: String, required: true, unique: true, uppercase: true },
    category: { type: String, default: "General Hospital" },
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    zip: { type: String, default: "" },
    headName: { type: String, default: "" },
    totalStaff: { type: Number, default: 0 },
    status: { type: String, enum: BRANCH_STATUSES, default: "active" },
  },
  { timestamps: true },
);

export type Branch = InferSchemaType<typeof branchSchema> & { _id: Types.ObjectId };
export const Branch = model("Branch", branchSchema);
