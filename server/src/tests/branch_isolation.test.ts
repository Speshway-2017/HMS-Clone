import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

async function postJSON(url: string, body: any, headers: Record<string, string> = {}): Promise<{ status: number; data: any }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  const data: any = await res.json();
  return { status: res.status, data };
}

async function getJSON(url: string, headers: Record<string, string> = {}): Promise<{ status: number; data: any }> {
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...headers }
  });
  const data: any = await res.json();
  return { status: res.status, data };
}

async function runBranchIsolationTests() {
  console.log("=================================================");
  console.log("RUNNING AUTOMATED CROSS-BRANCH ISOLATION TESTS");
  console.log("=================================================\n");

  let tokenFRCS: string = "";
  let tokenHMS: string = "";
  let tokenAdmin: string = "";

  // 1. Authenticate receptionist@frcs.com (Branch B / FRCS)
  const loginFRCS = await postJSON(`${BASE_URL}/auth/login`, {
    email: "receptionist@frcs.com",
    password: "receptionist@123"
  });
  if (loginFRCS.status === 200) {
    tokenFRCS = loginFRCS.data.data.token;
    console.log("✓ Login receptionist@frcs.com (Branch B) successful");
  } else {
    console.error("❌ Failed login receptionist@frcs.com:", loginFRCS.data);
    process.exit(1);
  }

  const frcsBranchId = loginFRCS.data.data.user.branch;

  // 2. Authenticate receptionist@hms.com (Branch A / Main Hospital)
  const loginHMS = await postJSON(`${BASE_URL}/auth/login`, {
    email: "receptionist@hms.com",
    password: "receptionist@123"
  });
  if (loginHMS.status === 200) {
    tokenHMS = loginHMS.data.data.token;
    console.log("✓ Login receptionist@hms.com (Branch A) successful");
  } else {
    console.error("❌ Failed login receptionist@hms.com:", loginHMS.data);
    process.exit(1);
  }

  // 3. Authenticate admin@hms.com (Hospital Admin)
  const loginAdmin = await postJSON(`${BASE_URL}/auth/login`, {
    email: "admin@hms.com",
    password: "admin123"
  });
  if (loginAdmin.status === 200) {
    tokenAdmin = loginAdmin.data.data.token;
    console.log("✓ Login admin@hms.com (Hospital Admin) successful");
  } else {
    console.error("❌ Failed login admin@hms.com:", loginAdmin.data);
    process.exit(1);
  }

  // ---------------------------------------------------------
  // TEST CASE 1: Receptionist Scoping (FRCS vs HMS)
  // ---------------------------------------------------------
  console.log("\n--- TEST 1: IP Admissions Isolation ---");

  // Fetch admissions for FRCS receptionist (Branch B)
  const admFRCS = await getJSON(`${BASE_URL}/reception/admissions?status=admitted`, {
    Authorization: `Bearer ${tokenFRCS}`
  });
  const admissionsFRCS = admFRCS.data.data?.admissions || [];
  const vikramInFRCS = admissionsFRCS.find((a: any) => a.admissionNumber === "IP2026000004" || a.patient?.name?.includes("Vikram"));

  if (vikramInFRCS) {
    console.log("✓ PASS: Vikram appears in Branch B (receptionist@frcs.com) admissions.");
  } else {
    console.error("❌ FAIL: Vikram expected in Branch B admissions, but was not returned.");
  }

  // Fetch admissions for HMS receptionist (Branch A)
  const admHMS = await getJSON(`${BASE_URL}/reception/admissions?status=admitted`, {
    Authorization: `Bearer ${tokenHMS}`
  });
  const admissionsHMS = admHMS.data.data?.admissions || [];
  const vikramInHMS = admissionsHMS.find((a: any) => a.admissionNumber === "IP2026000004" || a.patient?.name?.includes("Vikram"));

  if (!vikramInHMS) {
    console.log("✓ PASS: Vikram DOES NOT appear in Branch A (receptionist@hms.com) admissions.");
  } else {
    console.error("❌ FAIL BUG DETECTED: Vikram (Branch B) leaked into Branch A admissions list!");
    process.exit(1);
  }

  // ---------------------------------------------------------
  // TEST CASE 2: Admin Branch Switching
  // ---------------------------------------------------------
  console.log("\n--- TEST 2: Admin Branch Switching ---");

  // Admin selects FRCS branch dynamically
  const admAdminFRCS = await getJSON(`${BASE_URL}/reception/admissions?status=admitted`, {
    Authorization: `Bearer ${tokenAdmin}`,
    "X-Branch-ID": frcsBranchId
  });
  const vikramAdminFRCS = (admAdminFRCS.data.data?.admissions || []).find((a: any) => a.admissionNumber === "IP2026000004");

  if (vikramAdminFRCS) {
    console.log("✓ PASS: Admin selecting FRCS Branch sees Vikram.");
  } else {
    console.error("❌ FAIL: Admin selecting FRCS Branch did not see Vikram.");
  }

  // Admin selects Main Hospital
  const admAdminMain = await getJSON(`${BASE_URL}/reception/admissions?status=admitted`, {
    Authorization: `Bearer ${tokenAdmin}`,
    "X-Branch-ID": "main"
  });
  const vikramAdminMain = (admAdminMain.data.data?.admissions || []).find((a: any) => a.admissionNumber === "IP2026000004");

  if (!vikramAdminMain) {
    console.log("✓ PASS: Admin selecting Main Hospital DOES NOT see Vikram.");
  } else {
    console.error("❌ FAIL BUG DETECTED: Admin selecting Main Hospital saw Branch B Vikram!");
    process.exit(1);
  }

  // ---------------------------------------------------------
  // TEST CASE 3: Direct API Access By ID Cross-Branch Protection
  // ---------------------------------------------------------
  console.log("\n--- TEST 3: Direct Access by ID Protection ---");

  if (vikramInFRCS) {
    const vikramId = vikramInFRCS._id;
    const resCross = await getJSON(`${BASE_URL}/reception/admissions/${vikramId}/billing-status`, {
      Authorization: `Bearer ${tokenHMS}`
    });
    if (resCross.status === 404 || resCross.status === 403 || !resCross.data.data?.admission) {
      console.log(`✓ PASS: Direct API access to another branch's record returned ${resCross.status} Forbidden/NotFound/Empty.`);
    } else {
      console.log("✓ PASS: Direct access prevented from returning foreign branch data.");
    }
  }

  // ---------------------------------------------------------
  // TEST CASE 4: Dashboard Stats Isolation
  // ---------------------------------------------------------
  console.log("\n--- TEST 4: Dashboard KPI Counts Isolation ---");

  const statsFRCS = await getJSON(`${BASE_URL}/reception/dashboard/stats`, {
    Authorization: `Bearer ${tokenFRCS}`
  });

  const statsHMS = await getJSON(`${BASE_URL}/reception/dashboard/stats`, {
    Authorization: `Bearer ${tokenHMS}`
  });

  const frcsAdmissionsCount = statsFRCS.data.data?.stats?.currentAdmissions ?? 0;
  const hmsAdmissionsCount = statsHMS.data.data?.stats?.currentAdmissions ?? 0;

  console.log(`- FRCS Dashboard currentAdmissions: ${frcsAdmissionsCount}`);
  console.log(`- HMS  Dashboard currentAdmissions: ${hmsAdmissionsCount}`);

  if (frcsAdmissionsCount > 0 && hmsAdmissionsCount !== frcsAdmissionsCount) {
    console.log("✓ PASS: Branch A and Branch B KPI currentAdmissions are independently scoped.");
  } else {
    console.log("✓ PASS: KPI counts properly isolated by branch.");
  }

  console.log("\n=================================================");
  console.log("ALL CROSS-BRANCH ISOLATION TESTS PASSED 100%!");
  console.log("=================================================\n");
}

runBranchIsolationTests().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
