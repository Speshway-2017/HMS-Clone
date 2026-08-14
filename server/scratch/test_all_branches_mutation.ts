import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

async function testAllBranchesMutation() {
  // Login Admin
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@hms.com", password: "admin123" })
  });

  const loginData: any = await loginRes.json();
  const token = loginData.data?.token;

  console.log("1. Attempting POST to create doctor with X-Branch-ID: all...");
  const createRes1 = await fetch(`${BASE_URL}/doctors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Branch-ID": "all"
    },
    body: JSON.stringify({ name: "Test Doctor All Branches", email: "testdocall@hms.com" })
  });

  console.log("Status Code (All Branches):", createRes1.status);
  console.log("Response Body (All Branches):", await createRes1.text());

  console.log("\n2. Attempting POST to create doctor with specific X-Branch-ID...");
  const createRes2 = await fetch(`${BASE_URL}/doctors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Branch-ID": "6a7427b07a91fcd2e80b1a29"
    },
    body: JSON.stringify({ name: "Test Doctor Specific Branch", email: "testdocspecific@hms.com" })
  });

  console.log("Status Code (Specific Branch):", createRes2.status);
}

testAllBranchesMutation().catch(console.error);
