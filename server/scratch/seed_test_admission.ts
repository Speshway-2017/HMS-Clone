import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function seedTestAdmission() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const hospital = await db.collection("hospitals").findOne({});
  const frcsBranch = await db.collection("branches").findOne({ name: /Ameerpet/i });

  if (!hospital || !frcsBranch) {
    console.error("Missing hospital or branch");
    process.exit(1);
  }

  // Create Patient Vikram
  const vikramPatRes = await db.collection("patients").updateOne(
    { name: "Vikram" },
    {
      $set: {
        name: "Vikram",
        hospital: hospital._id,
        branch: frcsBranch._id,
        phone: "9876543210",
        uhid: "UHID-9999999999",
        patientCode: "PAT-999999",
        status: "admitted",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  const vikramPat = await db.collection("patients").findOne({ name: "Vikram" });

  // Create Admission IP2026000004
  await db.collection("admissions").updateOne(
    { admissionNumber: "IP2026000004" },
    {
      $set: {
        admissionNumber: "IP2026000004",
        patient: vikramPat!._id,
        hospital: hospital._id,
        branch: frcsBranch._id,
        status: "admitted",
        admissionDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  console.log("✓ Seeded Vikram patient and admission IP2026000004 for FRCS branch:", frcsBranch._id);
  await mongoose.disconnect();
}

seedTestAdmission().catch(console.error);
