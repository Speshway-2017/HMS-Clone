import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { env } from "../config/env";
import { Hospital } from "../models/Hospital";
import { User } from "../models/User";

const DEMO_PASSWORD = "Password123!";

async function run() {
  await connectDB();

  await Promise.all([User.deleteMany({}), Hospital.deleteMany({})]);

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
