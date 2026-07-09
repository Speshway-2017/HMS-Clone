import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { env } from "../config/env";
import { Hospital } from "../models/Hospital";
import { Branch } from "../models/Branch";
import { Department } from "../models/Department";
import { Report } from "../models/Report";
import { User } from "../models/User";
import { generateBranchId } from "../utils/idGenerator";

const DEMO_PASSWORD = "Password123!";

async function run() {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Hospital.deleteMany({}),
    Branch.deleteMany({}),
    Department.deleteMany({}),
    Report.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const superAdminPasswordHash = await bcrypt.hash(env.superAdmin.password, 10);

  const superAdmin = await User.create({
    name: env.superAdmin.name,
    email: env.superAdmin.email,
    passwordHash: superAdminPasswordHash,
    role: "super_admin",
    hospital: null,
  });

  const hospital = await Hospital.create({
    name: "Sunrise General Hospital",
    code: "SUNRISE",
    address: "12 Wellness Ave, Springfield",
    contactEmail: "contact@sunrisegeneral.test",
    contactPhone: "+1-555-0100",
    createdBy: superAdmin._id,
  });

  const hospitalAdmin = await User.create({
    name: "Cristopher Nolan",
    email: "admin@hms.test",
    passwordHash,
    role: "hospital_admin",
    hospital: hospital._id,
  });

  const accountant = await User.create({
    name: "Priya Sharma",
    email: "accountant@hms.test",
    passwordHash,
    role: "accountant",
    hospital: hospital._id,
  });

  await Branch.create({
    hospital: hospital._id,
    name: "North Wellness Center",
    branchId: generateBranchId(),
    category: "General Hospital",
    city: "Springfield",
    state: "IL",
    headName: "Dr. Sarah Jenkins",
    totalStaff: 48,
    status: "active",
  });

  await Department.create({
    hospital: hospital._id,
    name: "Cardiology",
    category: "cardiology",
    description: "Specialized care for heart and cardiovascular systems.",
    headName: "Dr. Rachel Henderson",
    totalBeds: 40,
    doctors: 6,
    nurses: 14,
    support: 5,
    services: ["Outpatient Care", "Intensive Care (ICU)"],
    rating: 92,
    status: "operational",
  });

  console.log("Seed complete. Demo accounts:");
  console.table([
    { role: superAdmin.role, email: superAdmin.email, password: env.superAdmin.password },
    { role: hospitalAdmin.role, email: hospitalAdmin.email, password: DEMO_PASSWORD },
    { role: accountant.role, email: accountant.email, password: DEMO_PASSWORD },
  ]);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
