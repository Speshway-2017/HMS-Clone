import assert from "assert";

// Test suite for Diagnosis/Round Subject and Daily Progress Notes validations
function validateDiagnosis(val: string): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) {
    return "Diagnosis/Round Subject is required";
  }
  if (trimmed.length > 200) {
    return "Diagnosis/Round Subject exceeds the maximum allowed length";
  }
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrTag = /<[^>]*>|javascript:/i.test(trimmed);
  if (!hasAlphanumeric || hasScriptOrTag) {
    return "Please enter valid data";
  }
  return null;
}

function validateProgressNotes(val: string): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) {
    return "Daily Progress Notes is required";
  }
  if (trimmed.length > 2000) {
    return "Daily Progress Notes exceeds the maximum allowed length";
  }
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrJs = /<script\b|javascript:/i.test(trimmed);
  if (!hasAlphanumeric || hasScriptOrJs) {
    return "Please enter valid data";
  }
  return null;
}

console.log("=================================================");
console.log("RUNNING HMS DOCTOR DASHBOARD VERIFICATION TESTS");
console.log("=================================================\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name: string, fn: () => void) {
  totalCount++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

// Phase 5: Diagnosis / Round Subject
runTest("Test Case 22: Diagnosis rejects invalid data (pure punctuation)", () => {
  const res = validateDiagnosis("!@#$%^&*()");
  assert.strictEqual(res, "Please enter valid data");
});

runTest("Test Case 22: Diagnosis rejects script tags / XSS attempts", () => {
  const res = validateDiagnosis("<script>alert('xss')</script>");
  assert.strictEqual(res, "Please enter valid data");
});

runTest("Test Case 22: Diagnosis rejects javascript: protocol URI", () => {
  const res = validateDiagnosis("javascript:void(0)");
  assert.strictEqual(res, "Please enter valid data");
});

runTest("Test Case 23: Diagnosis rejects empty string", () => {
  const res = validateDiagnosis("");
  assert.strictEqual(res, "Diagnosis/Round Subject is required");
});

runTest("Test Case 23: Diagnosis rejects whitespace-only string", () => {
  const res = validateDiagnosis("    ");
  assert.strictEqual(res, "Diagnosis/Round Subject is required");
});

runTest("Test Case 24: Diagnosis rejects length exceeding 200 characters", () => {
  const longStr = "A".repeat(201);
  const res = validateDiagnosis(longStr);
  assert.strictEqual(res, "Diagnosis/Round Subject exceeds the maximum allowed length");
});

runTest("Test Case 24: Diagnosis accepts exact boundary 200 characters", () => {
  const maxStr = "A".repeat(200);
  const res = validateDiagnosis(maxStr);
  assert.strictEqual(res, null);
});

runTest("Phase 5: Diagnosis accepts legitimate medical terminology with punctuation & symbols", () => {
  const validClinical = "Post-op Day 2: Appendectomy monitoring - BP 120/80 mmHg, Temp 98.6°F, O2 sat 99% on R/A";
  const res = validateDiagnosis(validClinical);
  assert.strictEqual(res, null);
});

// Phase 6: Daily Progress Notes
runTest("Test Case 25: Daily Progress Notes rejects invalid data (pure punctuation)", () => {
  const res = validateProgressNotes("???#####$$$$");
  assert.strictEqual(res, "Please enter valid data");
});

runTest("Test Case 25: Daily Progress Notes rejects script injection", () => {
  const res = validateProgressNotes("<script>document.cookie</script>");
  assert.strictEqual(res, "Please enter valid data");
});

runTest("Test Case 26: Daily Progress Notes rejects empty string", () => {
  const res = validateProgressNotes("");
  assert.strictEqual(res, "Daily Progress Notes is required");
});

runTest("Test Case 26: Daily Progress Notes rejects whitespace-only string", () => {
  const res = validateProgressNotes("   \n\t   ");
  assert.strictEqual(res, "Daily Progress Notes is required");
});

runTest("Additional Test: Daily Progress Notes rejects length exceeding 2000 characters", () => {
  const tooLongNote = "N".repeat(2001);
  const res = validateProgressNotes(tooLongNote);
  assert.strictEqual(res, "Daily Progress Notes exceeds the maximum allowed length");
});

runTest("Additional Test: Daily Progress Notes accepts exact boundary 2000 characters", () => {
  const boundaryNote = "N".repeat(2000);
  const res = validateProgressNotes(boundaryNote);
  assert.strictEqual(res, null);
});

runTest("Phase 6: Daily Progress Notes accepts legitimate multiline clinical SOAP notes", () => {
  const validNote = `S: Patient reports mild incisional soreness (3/10), no nausea or chills.
O: Vitals stable: BP 118/76, HR 72, RR 16, SpO2 99%. Abdomen soft, non-distended.
A: Post-operative Day 2 following uncomplicated laparoscopic appendectomy. Stable.
P: Continue oral analgesics as needed. Encourage ambulation. Advance diet as tolerated.`;
  const res = validateProgressNotes(validNote);
  assert.strictEqual(res, null);
});

console.log(`\nResults: ${passedCount}/${totalCount} tests passed.\n`);
if (passedCount !== totalCount) {
  process.exit(1);
}

