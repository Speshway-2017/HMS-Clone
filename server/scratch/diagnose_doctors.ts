import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

async function diagnose() {
  // Login as Madhapur receptionist
  const loginMadhapur = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "receptionist@hms.com", password: "receptionist@123" })
  });
  const madhapurData: any = await loginMadhapur.json();
  const tokenMadhapur = madhapurData.data?.token;
  const madhapurUser = madhapurData.data?.user;
  console.log("Madhapur receptionist branch:", madhapurUser?.branch);

  // Fetch doctors for Madhapur
  const docsMadhapur = await fetch(`${BASE_URL}/reception/doctors/availability`, {
    headers: { Authorization: `Bearer ${tokenMadhapur}` }
  });
  const docsMadhapurData: any = await docsMadhapur.json();
  console.log("\nMadhapur Doctors:");
  (docsMadhapurData.data?.doctors || []).forEach((d: any) => {
    console.log(`  - ${d.name} (branch: ${d.branch})`);
  });

  // Login as Hitech receptionist
  const loginHitech = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "receptionist2@hms.com", password: "receptionist@123" })
  });
  const hitechData: any = await loginHitech.json();
  const tokenHitech = hitechData.data?.token;
  const hitechUser = hitechData.data?.user;
  console.log("\nHitech receptionist branch:", hitechUser?.branch);

  if (!tokenHitech) {
    console.log("Hitech login failed:", hitechData);
    
    // Also check what branches exist
    await mongoose.connect(process.env.MONGO_URI as string);
    const db = mongoose.connection.db!;
    const branches = await db.collection("branches").find({}).toArray();
    console.log("\nAll Branches:");
    branches.forEach(b => console.log(`  - ${b.name} (${b._id})`));
    const doctors = await db.collection("doctors").find({}).toArray();
    console.log("\nAll Doctors in DB:");
    doctors.forEach(d => console.log(`  - ${d.name} (branch: ${d.branch})`));
    const users = await db.collection("users").find({ role: "receptionist" }).toArray();
    console.log("\nReceptionist Users:");
    users.forEach(u => console.log(`  - ${u.email} (branch: ${u.branch})`));
    await mongoose.disconnect();
    return;
  }

  // Fetch doctors for Hitech
  const docsHitech = await fetch(`${BASE_URL}/reception/doctors/availability`, {
    headers: { Authorization: `Bearer ${tokenHitech}` }
  });
  const docsHitechData: any = await docsHitech.json();
  console.log("\nHitech Doctors:");
  (docsHitechData.data?.doctors || []).forEach((d: any) => {
    console.log(`  - ${d.name} (branch: ${d.branch})`);
  });
}

diagnose().catch(console.error);
