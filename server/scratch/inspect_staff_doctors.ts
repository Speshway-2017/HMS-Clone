import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  console.log("=== BRANCHES ===");
  const branches = await db.collection("branches").find({}).toArray();
  for (const b of branches) {
    console.log(`Branch: ${b.name} (_id: ${b._id}, totalStaff field: ${b.totalStaff})`);
  }

  console.log("\n=== DOCTORS ===");
  const doctors = await db.collection("doctors").find({}).toArray();
  console.log(`Total Doctors in DB: ${doctors.length}`);
  for (const d of doctors) {
    console.log(`Doctor: ${d.name} | Hospital: ${d.hospital} | Branch: ${d.branch}`);
  }

  console.log("\n=== STAFF ===");
  const staff = await db.collection("staffs").find({}).toArray();
  console.log(`Total Staff in DB: ${staff.length}`);
  for (const s of staff) {
    console.log(`Staff: ${s.name} | Role: ${s.role} | Hospital: ${s.hospital} | Branch: ${s.branch}`);
  }

  console.log("\n=== USERS ===");
  const users = await db.collection("users").find({}).toArray();
  console.log(`Total Users in DB: ${users.length}`);
  for (const u of users) {
    console.log(`User: ${u.name} | Role: ${u.role} | Hospital: ${u.hospital} | Branch: ${u.branch}`);
  }

  await mongoose.disconnect();
}

inspect();
