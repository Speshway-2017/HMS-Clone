import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function fixVikramBranch() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const frcsBranchId = new mongoose.Types.ObjectId("6a7af34021c9633db292c91c");

  // Fix Admission IP2026000004 (Vikram)
  const admRes = await db.collection("admissions").updateOne(
    { admissionNumber: "IP2026000004" },
    { $set: { branch: frcsBranchId } }
  );
  console.log("Updated Admission IP2026000004 branch:", admRes.modifiedCount);

  // Fix Patient Vikram
  const patRes = await db.collection("patients").updateOne(
    { name: /Vikram/i },
    { $set: { branch: frcsBranchId } }
  );
  console.log("Updated Patient Vikram branch:", patRes.modifiedCount);

  await mongoose.disconnect();
}
fixVikramBranch();
