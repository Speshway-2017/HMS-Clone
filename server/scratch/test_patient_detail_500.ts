import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

async function testPatientDetail() {
  console.log("1. Logging in as receptionist@hms.com...");
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "receptionist@hms.com", password: "receptionist@123" })
  });

  const loginData: any = await loginRes.json();
  const token = loginData.data?.token;

  if (!token) {
    console.error("Login failed:", loginData);
    process.exit(1);
  }

  const patientId = "6a7d8b6376c41ba56c7061c3";
  console.log(`\n2. Requesting GET /reception/patients/${patientId}...`);
  const res = await fetch(`${BASE_URL}/reception/patients/${patientId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  console.log("Status Code:", res.status);
  console.log("Response Body:", await res.text());
}

testPatientDetail().catch(console.error);
