import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function fullDiagnosis() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const hospitals = await db.collection("hospitals").find({}).toArray();
  console.log("=== HOSPITALS ===");
  hospitals.forEach(h => console.log(`  ${h.name} (${h._id})`));

  const branches = await db.collection("branches").find({}).toArray();
  console.log("\n=== BRANCHES ===");
  branches.forEach(b => console.log(`  ${b.name} (${b._id}) - hospital: ${b.hospital}`));

  const users = await db.collection("users").find({}).toArray();
  console.log("\n=== USERS ===");
  users.forEach(u => console.log(`  ${u.email} role:${u.role} branch:${u.branch} name:${u.name}`));

  const doctors = await db.collection("doctors").find({}).toArray();
  console.log("\n=== DOCTORS ===");
  doctors.forEach(d => {
    const branch = branches.find(b => String(b._id) === String(d.branch));
    console.log(`  ${d.name} branch:${d.branch} (${branch?.name || "null = Main Hospital"})`);
  });

  await mongoose.disconnect();
}

fullDiagnosis().catch(console.error);
