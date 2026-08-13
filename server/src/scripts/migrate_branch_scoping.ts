import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function runMigration() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI is missing from environment.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB for Multi-Branch Scoping Migration...");
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db!;

  const frcsBranchId = new mongoose.Types.ObjectId("6a7af34021c9633db292c91c"); // Ameerpet / FRCS
  const madhapurBranchId = new mongoose.Types.ObjectId("6a7427b07a91fcd2e80b1a29"); // Madhapur

  console.log("\n1. Migrating Patient Vikram & Admission IP2026000004...");
  const vikramPatRes = await db.collection("patients").updateMany(
    { name: /Vikram/i },
    { $set: { branch: frcsBranchId } }
  );
  console.log(`- Updated ${vikramPatRes.modifiedCount} Vikram patient record(s) to FRCS Branch.`);

  const vikramAdmRes = await db.collection("admissions").updateMany(
    { admissionNumber: "IP2026000004" },
    { $set: { branch: frcsBranchId } }
  );
  console.log(`- Updated ${vikramAdmRes.modifiedCount} Vikram admission record(s) to FRCS Branch.`);

  console.log("\n2. Backfilling Admissions missing branch...");
  const admissionsNoBranch = await db.collection("admissions").find({
    $or: [{ branch: null }, { branch: { $exists: false } }]
  }).toArray();

  let admMigrated = 0;
  let admUnresolvable = 0;

  for (const adm of admissionsNoBranch) {
    let resolvedBranch: any = null;

    // Try resolving from admittingDoctor
    if (adm.admittingDoctor) {
      const doc = await db.collection("doctors").findOne({ _id: adm.admittingDoctor });
      if (doc && doc.branch) resolvedBranch = doc.branch;
    }

    // Try resolving from patient
    if (!resolvedBranch && adm.patient) {
      const pat = await db.collection("patients").findOne({ _id: adm.patient });
      if (pat && pat.branch) resolvedBranch = pat.branch;
    }

    // Try resolving from room
    if (!resolvedBranch && adm.room) {
      const rm = await db.collection("rooms").findOne({ _id: adm.room });
      if (rm && rm.branch) resolvedBranch = rm.branch;
    }

    if (resolvedBranch) {
      await db.collection("admissions").updateOne(
        { _id: adm._id },
        { $set: { branch: resolvedBranch } }
      );
      admMigrated++;
    } else {
      admUnresolvable++;
      console.warn(`  [UNRESOLVABLE ADMISSION] ID: ${adm._id}, Admission No: ${adm.admissionNumber}, Patient: ${adm.patient}`);
    }
  }
  console.log(`- Admissions migrated: ${admMigrated}, Unresolvable: ${admUnresolvable}`);

  console.log("\n3. Backfilling Appointments missing branch...");
  const appointmentsNoBranch = await db.collection("appointments").find({
    $or: [{ branch: null }, { branch: { $exists: false } }]
  }).toArray();

  let apptMigrated = 0;
  let apptUnresolvable = 0;

  for (const appt of appointmentsNoBranch) {
    let resolvedBranch: any = null;

    if (appt.doctor) {
      const doc = await db.collection("doctors").findOne({ _id: appt.doctor });
      if (doc && doc.branch) resolvedBranch = doc.branch;
    }
    if (!resolvedBranch && appt.patient) {
      const pat = await db.collection("patients").findOne({ _id: appt.patient });
      if (pat && pat.branch) resolvedBranch = pat.branch;
    }

    if (resolvedBranch) {
      await db.collection("appointments").updateOne(
        { _id: appt._id },
        { $set: { branch: resolvedBranch } }
      );
      apptMigrated++;
    } else {
      apptUnresolvable++;
    }
  }
  console.log(`- Appointments migrated: ${apptMigrated}, Unresolvable: ${apptUnresolvable}`);

  console.log("\n4. Backfilling Lab & Radiology Orders missing branch...");
  const labOrdersNoBranch = await db.collection("laborders").find({
    $or: [{ branch: null }, { branch: { $exists: false } }]
  }).toArray();

  for (const lab of labOrdersNoBranch) {
    let resolvedBranch: any = null;
    if (lab.doctor) {
      const doc = await db.collection("doctors").findOne({ _id: lab.doctor });
      if (doc && doc.branch) resolvedBranch = doc.branch;
    }
    if (!resolvedBranch && lab.patient) {
      const pat = await db.collection("patients").findOne({ _id: lab.patient });
      if (pat && pat.branch) resolvedBranch = pat.branch;
    }
    if (resolvedBranch) {
      await db.collection("laborders").updateOne({ _id: lab._id }, { $set: { branch: resolvedBranch } });
    }
  }

  const radOrdersNoBranch = await db.collection("radiologyorders").find({
    $or: [{ branch: null }, { branch: { $exists: false } }]
  }).toArray();

  for (const rad of radOrdersNoBranch) {
    let resolvedBranch: any = null;
    if (rad.doctor) {
      const doc = await db.collection("doctors").findOne({ _id: rad.doctor });
      if (doc && doc.branch) resolvedBranch = doc.branch;
    }
    if (!resolvedBranch && rad.patient) {
      const pat = await db.collection("patients").findOne({ _id: rad.patient });
      if (pat && pat.branch) resolvedBranch = pat.branch;
    }
    if (resolvedBranch) {
      await db.collection("radiologyorders").updateOne({ _id: rad._id }, { $set: { branch: resolvedBranch } });
    }
  }
  console.log("- Lab & Radiology orders backfilled.");

  console.log("\n5. Backfilling IP Charges & Prescriptions missing branch...");
  const ipChargesNoBranch = await db.collection("ipcharges").find({
    $or: [{ branch: null }, { branch: { $exists: false } }]
  }).toArray();

  for (const ipc of ipChargesNoBranch) {
    if (ipc.admission) {
      const adm = await db.collection("admissions").findOne({ _id: ipc.admission });
      if (adm && adm.branch) {
        await db.collection("ipcharges").updateOne({ _id: ipc._id }, { $set: { branch: adm.branch } });
      }
    }
  }

  const prescriptionsNoBranch = await db.collection("prescriptions").find({
    $or: [{ branch: null }, { branch: { $exists: false } }]
  }).toArray();

  for (const rx of prescriptionsNoBranch) {
    let resolvedBranch: any = null;
    if (rx.admission) {
      const adm = await db.collection("admissions").findOne({ _id: rx.admission });
      if (adm && adm.branch) resolvedBranch = adm.branch;
    }
    if (!resolvedBranch && rx.doctor) {
      const doc = await db.collection("doctors").findOne({ _id: rx.doctor });
      if (doc && doc.branch) resolvedBranch = doc.branch;
    }
    if (resolvedBranch) {
      await db.collection("prescriptions").updateOne({ _id: rx._id }, { $set: { branch: resolvedBranch } });
    }
  }
  console.log("- IP Charges & Prescriptions backfilled.");

  console.log("\nMigration completed successfully.");
  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
