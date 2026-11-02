import { Schema, model, InferSchemaType, Types } from "mongoose";

const customRoleSchema = new Schema(
  {
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: false, default: null },
    role: { type: String, required: true, maxlength: 50 },
    label: { type: String, required: true, maxlength: 50 },
    description: { type: String, default: "", maxlength: 500 },
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Compound index for role keys
customRoleSchema.index({ hospital: 1, role: 1 }, { unique: true, sparse: true });

export type CustomRole = InferSchemaType<typeof customRoleSchema> & { _id: Types.ObjectId };
export const CustomRole = model<CustomRole>("Role", customRoleSchema);
