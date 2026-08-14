import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function listAdmissions() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const admissions = await db.collection("admissions").find({}).toArray();
  const patients = await db.collection("patients").find({}).toArray();

  console.log(`Admissions count: ${admissions.length}`);
  admissions.forEach(a => console.log(`- ${a.admissionNumber} status: ${a.status} branch: ${a.branch}`));

  console.log(`Patients count: ${patients.length}`);
  patients.forEach(p => console.log(`- ${p.name} (${p._id}) branch: ${p.branch}`));

  await mongoose.disconnect();
}

listAdmissions().catch(console.error);
