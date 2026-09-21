import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { env } from "../config/env";
import { Hospital } from "../models/Hospital";
import { Branch } from "../models/Branch";
import { Department } from "../models/Department";
import { Report } from "../models/Report";
import { User } from "../models/User";
import { Doctor } from "../models/Doctor";
import { Staff } from "../models/Staff";
import { Patient } from "../models/Patient";
import { Appointment } from "../models/Appointment";
import { InventoryItem } from "../models/InventoryItem";
import { Invoice } from "../models/Invoice";
import { Room } from "../models/Room";
import { Bed } from "../models/Bed";
import { OPVisit } from "../models/OPVisit";
import { Admission } from "../models/Admission";
import { Payment } from "../models/Payment";
import { Queue } from "../models/Queue";
import { AuditLog } from "../models/AuditLog";
import { DbNotification } from "../models/DbNotification";

async function run() {
  await connectDB();

  // ── Wipe everything ────────────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Hospital.deleteMany({}),
    Branch.deleteMany({}),
    Department.deleteMany({}),
    Report.deleteMany({}),
    Doctor.deleteMany({}),
    Staff.deleteMany({}),
    Patient.deleteMany({}),
    Appointment.deleteMany({}),
    InventoryItem.deleteMany({}),
    Invoice.deleteMany({}),
    Room.deleteMany({}),
    Bed.deleteMany({}),
    OPVisit.deleteMany({}),
    Admission.deleteMany({}),
    Payment.deleteMany({}),
    Queue.deleteMany({}),
    AuditLog.deleteMany({}),
    DbNotification.deleteMany({}),
  ]);

  // ── Super Admin (credentials from .env) ────────────────────────────────────
  const superAdminPasswordHash = await bcrypt.hash(env.superAdmin.password, 10);

  const superAdmin = await User.create({
    name: env.superAdmin.name,
    email: env.superAdmin.email,
    passwordHash: superAdminPasswordHash,
    role: "super_admin",
    hospital: null,
  });

  console.log("Seed complete. Demo accounts:");
  console.table([
    { role: superAdmin.role, email: superAdmin.email, password: env.superAdmin.password },
  ]);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
