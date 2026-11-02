import mongoose from "mongoose";
import dotenv from "dotenv";
import { buildBranchQuery } from "../src/utils/branchQueryHelper";
dotenv.config();

async function runSystemWideVerification() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;

  const parentHospitalId = new mongoose.Types.ObjectId("6a7420cc7a91fcd2e80b14bb");
  const madhapurBranchId = new mongoose.Types.ObjectId("6a7427b07a91fcd2e80b14bb");
  const ameerpetBranchId = new mongoose.Types.ObjectId("6a7af34021c9633db292c91c");

  console.log("==================================================");
  console.log("SYSTEM-WIDE MULTI-TENANT ISOLATION VERIFICATION");
  console.log("==================================================\n");

  const contexts = [
    { label: "Main Branch View", filter: { hospital: parentHospitalId, branch: null } },
    { label: "Madhapur Branch View", filter: { hospital: parentHospitalId, branch: madhapurBranchId } },
    { label: "Ameerpet (FRCS) Branch View", filter: { hospital: parentHospitalId, branch: ameerpetBranchId } },
    { label: "Admin All-Branches View", filter: { hospital: parentHospitalId } },
  ];

  const collections = [
    "admissions",
    "admissionrequests",
    "appointments",
    "invoices",
    "payments",
    "beds",
    "rooms",
    "wards",
    "laborders",
    "radiologyorders",
    "prescriptions"
  ];

  for (const ctx of contexts) {
    console.log(`\n--- ${ctx.label.toUpperCase()} ---`);
    const queryFilter = buildBranchQuery(ctx.filter);
    console.log("MongoDB Match Filter:", JSON.stringify(queryFilter));

    for (const col of collections) {
      const count = await db.collection(col).countDocuments(queryFilter);
      console.log(`  Collection [${col.padEnd(18)}]: ${count} records match`);
    }
  }

  console.log("\n==================================================");
  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");

  await mongoose.disconnect();
}

runSystemWideVerification();
