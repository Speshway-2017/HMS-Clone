import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

async function post(url: string, body: any) {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json() as any;
}

async function get(url: string, token: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { Authorization: `Bearer ${token}`, ...headers }
  });
  return res.json() as any;
}

async function runTests() {
  console.log("=================================================");
  console.log("DOCTOR BRANCH ISOLATION TEST");
  console.log("=================================================\n");

  // Login Hitech receptionist (branch: null = Main Hospital)
  const hitechLogin = await post("/auth/login", { email: "receptionist@hms.com", password: "receptionist@123" });
  const tokenHitech = hitechLogin.data?.token;
  const hitechBranch = hitechLogin.data?.user?.branch;
  console.log(`receptionist@hms.com (Hitech) branch: ${hitechBranch ?? "null (Main Hospital)"}`);

  // Login Madhapur receptionist (branch: 6a7d855f...)
  const madhapurLogin = await post("/auth/login", { email: "receptionist@cms.com", password: "receptionist@123" });
  const tokenMadhapur = madhapurLogin.data?.token;
  const madhapurBranch = madhapurLogin.data?.user?.branch;
  console.log(`receptionist@cms.com (Madhapur) branch: ${madhapurBranch}`);

  if (!tokenHitech || !tokenMadhapur) {
    console.error("Login failed");
    process.exit(1);
  }

  console.log("\n--- Hitech doctors (no branch header) ---");
  const hitechDocs = await get("/reception/doctors/availability", tokenHitech);
  const hitechDocNames = (hitechDocs.data?.doctors || []).map((d: any) => `${d.name}(branch:${d.branch ?? "null"})`);
  console.log("Doctors:", hitechDocNames.join(", "));

  const hitechHasMadhapurDoctor = (hitechDocs.data?.doctors || []).some((d: any) => String(d.branch) === madhapurBranch);
  if (hitechHasMadhapurDoctor) {
    console.error("❌ FAIL: Hitech receptionist sees Madhapur doctors!");
    process.exit(1);
  } else {
    console.log("✓ PASS: Hitech receptionist does NOT see Madhapur doctors.");
  }

  // Simulate stale localStorage: Hitech receptionist sends Madhapur's X-Branch-ID 
  console.log("\n--- Hitech doctors WITH stale X-Branch-ID: Madhapur (should still see only Hitech doctors) ---");
  const hitechDocsStale = await get("/reception/doctors/availability", tokenHitech, { "X-Branch-ID": madhapurBranch });
  const hitechDocsStaleNames = (hitechDocsStale.data?.doctors || []).map((d: any) => `${d.name}(branch:${d.branch ?? "null"})`);
  console.log("Doctors:", hitechDocsStaleNames.join(", "));

  const hitechStaleHasMadhapurDoctor = (hitechDocsStale.data?.doctors || []).some((d: any) => String(d.branch) === madhapurBranch);
  if (hitechStaleHasMadhapurDoctor) {
    console.error("❌ CRITICAL BUG: Stale X-Branch-ID allowed cross-branch data leak! Hitech sees Madhapur doctors!");
    process.exit(1);
  } else {
    console.log("✓ PASS: Stale X-Branch-ID correctly ignored — Hitech receptionist sees ONLY Main Hospital doctors.");
  }

  console.log("\n--- Madhapur doctors ---");
  const madhapurDocs = await get("/reception/doctors/availability", tokenMadhapur);
  const madhapurDocNames = (madhapurDocs.data?.doctors || []).map((d: any) => `${d.name}(branch:${d.branch ?? "null"})`);
  console.log("Doctors:", madhapurDocNames.join(", "));

  const madhapurHasHitechDoctor = (madhapurDocs.data?.doctors || []).some((d: any) => !d.branch);
  if (madhapurHasHitechDoctor) {
    console.error("❌ FAIL: Madhapur receptionist sees Main Hospital doctors!");
    process.exit(1);
  } else {
    console.log("✓ PASS: Madhapur receptionist does NOT see Main Hospital doctors.");
  }

  console.log("\n=================================================");
  console.log("ALL DOCTOR BRANCH ISOLATION TESTS PASSED ✓");
  console.log("=================================================");
}

runTests().catch(console.error);
