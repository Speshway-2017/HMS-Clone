import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function testBothLogins() {
  const url = `http://localhost:${process.env.PORT || 5000}/api/v1/auth/login`;

  console.log("--- Test 1: Wrong password 'receptionist@123' ---");
  const res1 = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "receptionist@hms.com", password: "receptionist@123" })
  });
  console.log("Status Code 1:", res1.status, await res1.text());

  console.log("\n--- Test 2: Correct password 'admin123' ---");
  const res2 = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "receptionist@hms.com", password: "admin123" })
  });
  console.log("Status Code 2:", res2.status, await res2.text());
}

testBothLogins().catch(console.error);
