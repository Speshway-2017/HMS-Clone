import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcrypt";
import { ROLES, Role } from "../utils/roles";

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  hospital: Types.ObjectId | null;
  title: string;
  phone: string;
  employeeId: string;
  avatarUrl: string;
  status: "active" | "inactive";
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", default: null },
    title: { type: String, default: "" },
    phone: { type: String, default: "" },
    employeeId: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = model<UserDocument>("User", userSchema);
