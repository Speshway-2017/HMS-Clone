import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, Role } from "../utils/roles";

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  hospital: Types.ObjectId | null;
  branch?: Types.ObjectId | null;
  title: string;
  phone: string;
  employeeId: string;
  avatarUrl: string;
  status: "active" | "inactive";
  lastLogin: Date | null;
  resetPasswordToken?: string | null;
  resetPasswordExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 100 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true },
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", default: null },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    title: { type: String, default: "", maxlength: 100 },
    phone: { type: String, default: "", maxlength: 10 },
    employeeId: { type: String, default: "", maxlength: 50 },
    avatarUrl: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    lastLogin: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = model<UserDocument>("User", userSchema);
