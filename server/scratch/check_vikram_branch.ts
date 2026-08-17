import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function checkVikram() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const vikramPat = await db.collection("patients").findOne({ name: /Vikram/i });
  const vikramAdm = await db.collection("admissions").findOne({ admissionNumber: "IP2026000004" });
  const frcsBranch = await db.collection("branches").findOne({ name: /Ameerpet/i });

  console.log("Vikram Patient:", vikramPat?._id, "branch:", vikramPat?.branch);
  console.log("Vikram Admission:", vikramAdm?._id, "branch:", vikramAdm?.branch);
  console.log("FRCS Branch:", frcsBranch?._id);

  if (frcsBranch && vikramAdm && String(vikramAdm.branch) !== String(frcsBranch._id)) {
    await db.collection("admissions").updateOne({ _id: vikramAdm._id }, { $set: { branch: frcsBranch._id } });
    await db.collection("patients").updateOne({ _id: vikramAdm.patient }, { $set: { branch: frcsBranch._id } });
    console.log("Updated Vikram admission and patient branch to:", frcsBranch._id);
  }

  await mongoose.disconnect();
}

checkVikram().catch(console.error);
