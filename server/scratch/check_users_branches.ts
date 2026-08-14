import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  console.log("=== USERS (Receptionists) ===");
  const users = await db.collection("users").find({ role: { $in: ["receptionist", "hospital_admin"] } }).toArray();
  for (const u of users) {
    console.log(`User: ${u.email} | Name: ${u.name} | Role: ${u.role} | hospital: ${u.hospital} | branch: ${u.branch}`);
  }

  console.log("\n=== BRANCHES ===");
  const branches = await db.collection("branches").find({}).toArray();
  for (const b of branches) {
    console.log(`Branch ID: ${b._id} | Name: ${b.name} | Code: ${b.code} | Hospital: ${b.hospital}`);
  }

  console.log("\n=== ADMISSIONS ===");
  const admissions = await db.collection("admissions").find({}).toArray();
  for (const a of admissions) {
    const p = await db.collection("patients").findOne({ _id: a.patient });
    console.log(`Admission ID: ${a._id} | IP: ${a.admissionNumber} | Status: ${a.status} | Patient: ${p?.name} (${p?.uhid}) | adm.branch: ${a.branch} | pat.branch: ${p?.branch}`);
  }

  await mongoose.disconnect();
}
check();
