import { Schema, model, InferSchemaType, Types } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    isRevoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ user: 1 });

export type RefreshToken = InferSchemaType<typeof refreshTokenSchema> & { _id: Types.ObjectId };
export const RefreshToken = model("RefreshToken", refreshTokenSchema);
