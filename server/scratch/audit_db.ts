import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function auditDB() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  console.log("=== USERS ===");
  const users = await db.collection("users").find({ email: { $in: [/receptionist/i, /admin/i, /frcs/i, /hms/i] } }).toArray();
  for (const u of users) {
    console.log(`User: ${u.name} (${u.email}) - role: ${u.role}, hospital: ${u.hospital}, branch: ${u.branch}`);
  }

  console.log("\n=== HOSPITALS & BRANCHES ===");
  const hospitals = await db.collection("hospitals").find({}).toArray();
  for (const h of hospitals) {
    console.log(`Hospital: ${h.name} (_id: ${h._id}, code: ${h.code})`);
  }
  const branches = await db.collection("branches").find({}).toArray();
  for (const b of branches) {
    console.log(`Branch: ${b.name} (_id: ${b._id}, hospital: ${b.hospital}, branchId: ${b.branchId})`);
  }

  console.log("\n=== PATIENT VIKRAM ===");
  const patients = await db.collection("patients").find({ name: /Vikram/i }).toArray();
  for (const p of patients) {
    console.log(`Patient: ${p.name} (uhid: ${p.uhid}, _id: ${p._id}), hospital: ${p.hospital}, branch: ${p.branch}`);
  }

  console.log("\n=== ADMISSIONS ===");
  const admissions = await db.collection("admissions").find({}).toArray();
  for (const a of admissions) {
    console.log(`Admission: ${a.admissionNumber} - patient: ${a.patient}, hospital: ${a.hospital}, branch: ${a.branch}, status: ${a.status}`);
  }

  await mongoose.disconnect();
}

auditDB().catch(console.error);
