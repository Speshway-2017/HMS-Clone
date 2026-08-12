const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function inspectLabUsers() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/hms";
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(uri);

  console.log("\n=== ALL USERS BY ROLE ===");
  const users = await mongoose.connection.db.collection("users").find({}).toArray();
  for (const u of users) {
    console.log(`User: ${u.name} | Role: ${u.role} | Hospital: ${u.hospital} | Branch: ${u.branch || "none"}`);
  }

  console.log("\n=== ALL HOSPITALS ===");
  const hospitals = await mongoose.connection.db.collection("hospitals").find({}).toArray();
  for (const h of hospitals) {
    console.log(`Hospital ID: ${h._id} | Name: ${h.name}`);
  }

  console.log("\n=== ALL LAB ORDERS WITH HOSPITAL ID ===");
  const labOrders = await mongoose.connection.db.collection("laborders").find({}).toArray();
  for (const lo of labOrders) {
    console.log(`LabOrder ID: ${lo._id} | Hospital: ${lo.hospital} | Branch: ${lo.branch} | Tests: ${lo.tests ? lo.tests.join(",") : ""}`);
  }

  console.log("\n=== ALL DIAGNOSTIC REPORTS WITH HOSPITAL ID ===");
  const reports = await mongoose.connection.db.collection("diagnosticreports").find({}).toArray();
  for (const r of reports) {
    console.log(`Report ID: ${r._id} | Hospital: ${r.hospital} | Branch: ${r.branch} | Title: ${r.title || r.testName || "Report"}`);
  }

  await mongoose.disconnect();
}

inspectLabUsers().catch(console.error);
