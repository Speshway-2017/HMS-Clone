import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

async function testMurali() {
  // Login as main receptionist (no branch)
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "receptionist@hms.com", password: "receptionist@123" })
  });
  const loginData: any = await loginRes.json();
  const token = loginData.data?.token;
  console.log("Token:", token ? "OK" : "FAILED");
  console.log("User branch:", loginData.data?.user?.branch);

  // Search for Murali
  const searchRes = await fetch(`${BASE_URL}/reception/patients/search?q=Murali`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const searchData: any = await searchRes.json();
  console.log("Search Murali:", JSON.stringify(searchData, null, 2));

  // Get Murali patient ID from search
  const patient = searchData.data?.patients?.[0];
  if (!patient) {
    console.error("Murali not found in search");
    return;
  }
  console.log("\nMurali patient ID:", patient._id, "branch:", patient.branch);

  // Try to GET patient detail without X-Branch-ID header
  console.log("\n--- GET without X-Branch-ID ---");
  const res1 = await fetch(`${BASE_URL}/reception/patients/${patient._id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Status (no branch header):", res1.status);
  const data1: any = await res1.json();
  console.log("Response:", JSON.stringify(data1, null, 2));

  // Try with X-Branch-ID: null (as main receptionist would have)
  console.log("\n--- GET with X-Branch-ID: main ---");
  const res2 = await fetch(`${BASE_URL}/reception/patients/${patient._id}`, {
    headers: { Authorization: `Bearer ${token}`, "X-Branch-ID": "main" }
  });
  console.log("Status (X-Branch-ID: main):", res2.status);
  const data2: any = await res2.json();
  console.log("Response:", JSON.stringify(data2.data?.patient?.name ?? data2, null, 2));
}

testMurali().catch(console.error);
