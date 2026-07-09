import bcrypt from "bcrypt";
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
    Doctor.deleteMany({}),
    Staff.deleteMany({}),
    Patient.deleteMany({}),
    Appointment.deleteMany({}),
    InventoryItem.deleteMany({}),
    Invoice.deleteMany({}),
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

  const cardiology = await Department.create({
    hospital: hospital._id,
    name: "Cardiology",
    category: "cardiology",
    description: "Specialized care for heart and cardiovascular systems.",
    headName: "Dr. Rachel Henderson",
    location: "Wing B, Floor 4",
    totalBeds: 40,
    occupiedBeds: 30,
    doctors: 6,
    nurses: 14,
    support: 5,
    services: ["Outpatient Care", "Intensive Care (ICU)"],
    rating: 92,
    status: "operational",
  });

  const doctor = await Doctor.create({
    hospital: hospital._id,
    department: cardiology._id,
    name: "Dr. Sarah Jenkins",
    email: "s.jenkins@sunrisegeneral.test",
    phone: "+1-555-012-3456",
    specialization: "Cardiology",
    qualification: "MD, FACC, PhD",
    licenseNo: "DOC-2024-001",
    bio: "Board-certified cardiologist with 15 years of experience in preventative cardiology.",
    status: "on_duty",
    rating: 98,
  });

  const staff = await Staff.create({
    hospital: hospital._id,
    department: cardiology._id,
    name: "Elena Rodriguez",
    role: "Reception Head",
    employeeId: "EMP-2024-0001",
    dutyStatus: "on_duty",
    checkInTime: "07:52 AM",
    taskLoad: 62,
    rating: 4.8,
  });

  const patient = await Patient.create({
    hospital: hospital._id,
    name: "Eleanor Johnson",
    email: "eleanor.j@email.com",
    phone: "+1-555-012-3456",
    age: 42,
    gender: "Female",
    bloodGroup: "O+",
    assignedDoctor: doctor._id,
    status: "opd",
    allergies: "Penicillin",
    insuranceProvider: "BlueShield PPO",
    insurancePolicyNumber: "#882",
    medicalHistory: [
      {
        date: new Date(new Date().setDate(new Date().getDate() - 7)),
        visitType: "Annual Comprehensive Physical",
        doctorName: doctor.name,
        department: cardiology.name,
        diagnosis: "Vitamin D deficiency noted. All other vital signs within normal parameters.",
        notes: "Recommended dietary adjustments and light supplementation.",
        status: "Completed",
      },
    ],
  });

  await Appointment.create({
    hospital: hospital._id,
    referenceId: `APT-${new Date().getFullYear()}-0001`,
    patient: patient._id,
    doctor: doctor._id,
    department: cardiology._id,
    date: new Date(),
    time: "09:30",
    type: "Consultation",
    status: "scheduled",
  });

  await InventoryItem.create({
    hospital: hospital._id,
    name: "Amoxicillin 500mg",
    sku: "MED-AX-092",
    category: "medicines",
    unit: "units",
    stockQty: 50,
    reorderLevel: 100,
    maxLevel: 500,
    unitCost: 2.5,
    supplier: "Global Pharma Co.",
    storageCondition: "Room temperature",
  });

  await Invoice.create({
    hospital: hospital._id,
    patient: patient._id,
    items: [
      { description: "Specialist Consultation", category: "consultation", quantity: 1, amount: 250 },
      { description: "Full Blood Count (FBC) + Lipids", category: "diagnostics", quantity: 1, amount: 185 },
    ],
    taxRate: 4.5,
    serviceFee: 15,
    insuranceCoveragePercent: 75,
    status: "partially_paid",
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
