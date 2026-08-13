import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

async function testMuraliById() {
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "receptionist@hms.com", password: "receptionist@123" })
  });
  const loginData: any = await loginRes.json();
  const token = loginData.data?.token;

  // The patient ID from the URL in the screenshot
  const muraliId = "6a7da281ae8dd1cee3624317";
  const res = await fetch(`${BASE_URL}/reception/patients/${muraliId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Status:", res.status);
  const data: any = await res.json();
  if (data.data?.patient) {
    console.log("Patient found:", data.data.patient.name, "branch:", data.data.patient.branch);
  } else {
    console.log("Response:", JSON.stringify(data, null, 2));
  }
}

testMuraliById().catch(console.error);
