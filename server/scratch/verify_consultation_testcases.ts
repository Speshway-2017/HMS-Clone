import {
  CONSULTATION_LIMITS,
  validateClinicalText,
  validateTemperature,
  validateBloodPressure,
  validatePulseRate,
  validateRespiratoryRate,
  validateOxygenSaturation,
  validateWeight,
  validateMedicineName,
  validateMedicineStrength,
  validateDosage,
  validateFrequency,
  validateDuration,
  validateRadiologyNotes,
  validatePrimaryDiagnosis,
  validateExpectedStay,
  validateAdmissionReason,
  validateAdmissionClinicalNotes,
  validateSpecialInstructions,
} from "../src/utils/consultationValidation";

interface TestCaseResult {
  id: string;
  field: string;
  testType: string;
  input: any;
  expectedError: string;
  actualError: string | null;
  passed: boolean;
}

const results: TestCaseResult[] = [];

function runTest(
  id: string,
  field: string,
  testType: string,
  input: any,
  expectedErrorSubstr: string,
  validator: (val: any) => string | null
) {
  const actualError = validator(input);
  const passed = actualError !== null && actualError.toLowerCase().includes(expectedErrorSubstr.toLowerCase());
  results.push({
    id,
    field,
    testType,
    input: typeof input === "string" && input.length > 30 ? input.slice(0, 27) + "..." : input,
    expectedError: expectedErrorSubstr,
    actualError,
    passed,
  });
}

function runValidTest(
  id: string,
  field: string,
  testType: string,
  input: any,
  validator: (val: any) => string | null
) {
  const actualError = validator(input);
  const passed = actualError === null;
  results.push({
    id,
    field,
    testType,
    input: typeof input === "string" && input.length > 30 ? input.slice(0, 27) + "..." : input,
    expectedError: "(None - Valid)",
    actualError: actualError || "(Valid)",
    passed,
  });
}

console.log("=== RUNNING 46 TEST CASES VERIFICATION ===\n");

// Phase 1: Consultation Details (TC-001 - TC-012)
// TC-001: Chief Complaint Invalid
runTest("TC-001", "Chief Complaint", "Invalid Input", "<script>alert('xss')</script>", "Please enter valid data", (v) =>
  validateClinicalText(v, "Chief Complaint", CONSULTATION_LIMITS.CHIEF_COMPLAINT)
);
// TC-002: Chief Complaint Too Long
runTest("TC-002", "Chief Complaint", "Too Long", "A".repeat(501), "Maximum allowed character limit exceeded", (v) =>
  validateClinicalText(v, "Chief Complaint", CONSULTATION_LIMITS.CHIEF_COMPLAINT)
);

// TC-003: Diagnosis Invalid / Required
runTest("TC-003", "Diagnosis", "Invalid Input", "   ", "Diagnosis is required", (v) =>
  validateClinicalText(v, "Diagnosis", CONSULTATION_LIMITS.DIAGNOSIS, true)
);
// TC-004: Diagnosis Too Long
runTest("TC-004", "Diagnosis", "Too Long", "D".repeat(201), "Maximum allowed character limit exceeded", (v) =>
  validateClinicalText(v, "Diagnosis", CONSULTATION_LIMITS.DIAGNOSIS, true)
);

// TC-005: Symptoms Invalid
runTest("TC-005", "Symptoms", "Invalid Input", "<style>body{color:red}</style>", "Please enter valid data", (v) =>
  validateClinicalText(v, "Symptoms", CONSULTATION_LIMITS.SYMPTOMS)
);
// TC-006: Symptoms Too Long
runTest("TC-006", "Symptoms", "Too Long", "S".repeat(501), "Maximum allowed character limit exceeded", (v) =>
  validateClinicalText(v, "Symptoms", CONSULTATION_LIMITS.SYMPTOMS)
);

// TC-007: Clinical Notes Invalid
runTest("TC-007", "Clinical Notes", "Invalid Input", "javascript:void(0)", "Please enter valid data", (v) =>
  validateClinicalText(v, "Clinical Notes", CONSULTATION_LIMITS.CLINICAL_NOTES)
);
// TC-008: Clinical Notes Too Long
runTest("TC-008", "Clinical Notes", "Too Long", "C".repeat(1001), "Maximum allowed character limit exceeded", (v) =>
  validateClinicalText(v, "Clinical Notes", CONSULTATION_LIMITS.CLINICAL_NOTES)
);

// TC-009: Treatment Plan Invalid
runTest("TC-009", "Treatment Plan", "Invalid Input", "!@#$%^&*()_+", "Please enter valid data", (v) =>
  validateClinicalText(v, "Treatment Plan", CONSULTATION_LIMITS.TREATMENT_PLAN)
);
// TC-010: Treatment Plan Too Long
runTest("TC-010", "Treatment Plan", "Too Long", "T".repeat(1001), "Maximum allowed character limit exceeded", (v) =>
  validateClinicalText(v, "Treatment Plan", CONSULTATION_LIMITS.TREATMENT_PLAN)
);

// TC-011: Advice / Follow-up Notes Invalid
runTest("TC-011", "Advice / Follow-up Notes", "Invalid Input", "<svg onload=alert(1)>", "Please enter valid data", (v) =>
  validateClinicalText(v, "Advice / Follow-up Notes", CONSULTATION_LIMITS.ADVICE)
);
// TC-012: Advice / Follow-up Notes Too Long
runTest("TC-012", "Advice / Follow-up Notes", "Too Long", "A".repeat(501), "Maximum allowed character limit exceeded", (v) =>
  validateClinicalText(v, "Advice / Follow-up Notes", CONSULTATION_LIMITS.ADVICE)
);

// Phase 2: Patient Vitals (TC-013 - TC-024)
// TC-013: Temperature Invalid
runTest("TC-013", "Temperature", "Invalid Input", "98.6Fahrenheit", "Please enter a valid temperature in °F", (v) =>
  validateTemperature(v)
);
// TC-014: Temperature Range
runTest("TC-014", "Temperature", "Too Long / Range", "125.0", "Temperature is outside the allowed range", (v) =>
  validateTemperature(v)
);

// TC-015: Blood Pressure Invalid
runTest("TC-015", "Blood Pressure", "Invalid Input", "120-80mmHg", "Please enter a valid blood pressure value", (v) =>
  validateBloodPressure(v)
);
// TC-016: Blood Pressure Limits
runTest("TC-016", "Blood Pressure", "Too Long / Limits", "350/200", "Please enter a valid blood pressure value", (v) =>
  validateBloodPressure(v)
);

// TC-017: Pulse Rate Invalid
runTest("TC-017", "Pulse Rate", "Invalid Input", "seventy-two", "Please enter a valid pulse rate", (v) =>
  validatePulseRate(v)
);
// TC-018: Pulse Rate Limits
runTest("TC-018", "Pulse Rate", "Too Long / Range", "320", "Please enter a valid pulse rate", (v) =>
  validatePulseRate(v)
);

// TC-019: Respiratory Rate Invalid
runTest("TC-019", "Respiratory Rate", "Invalid Input", "16 breaths", "Please enter a valid respiratory rate", (v) =>
  validateRespiratoryRate(v)
);
// TC-020: Respiratory Rate Limits
runTest("TC-020", "Respiratory Rate", "Too Long / Range", "99", "Please enter a valid respiratory rate", (v) =>
  validateRespiratoryRate(v)
);

// TC-021: Oxygen Saturation Invalid
runTest("TC-021", "Oxygen Saturation", "Invalid Input", "high99%", "Oxygen saturation must be between 0 and 100%", (v) =>
  validateOxygenSaturation(v)
);
// TC-022: Oxygen Saturation Limits
runTest("TC-022", "Oxygen Saturation", "Too Long / Range", "105", "Oxygen saturation must be between 0 and 100%", (v) =>
  validateOxygenSaturation(v)
);

// TC-023: Weight Invalid
runTest("TC-023", "Weight", "Invalid Input", "seventy kg", "Please enter a valid weight in KG", (v) =>
  validateWeight(v)
);
// TC-024: Weight Limits
runTest("TC-024", "Weight", "Too Long / Range", "-10", "Please enter a valid weight in KG", (v) =>
  validateWeight(v)
);

// Phase 3: Issue Medication (TC-025 - TC-034)
// TC-025: Medicine Name Invalid
runTest("TC-025", "Medicine Name", "Invalid Input", "???###$$$", "Please enter a valid medicine name", (v) =>
  validateMedicineName(v)
);
// TC-026: Medicine Name Too Long
runTest("TC-026", "Medicine Name", "Too Long", "M".repeat(151), "Maximum allowed character limit exceeded", (v) =>
  validateMedicineName(v)
);

// TC-027: Custom Strength Invalid
runTest("TC-027", "Custom Strength", "Invalid Input", "   ", "Please enter a valid medicine strength", (v) =>
  validateMedicineStrength(v, true)
);
// TC-028: Custom Strength Too Long
runTest("TC-028", "Custom Strength", "Too Long", "5".repeat(51), "Maximum allowed character limit exceeded", (v) =>
  validateMedicineStrength(v, true)
);

// TC-029: Dosage Invalid
runTest("TC-029", "Dosage", "Invalid Input", "---", "Please enter a valid dosage", (v) =>
  validateDosage(v)
);
// TC-030: Dosage Too Long
runTest("TC-030", "Dosage", "Too Long", "1".repeat(51), "Maximum allowed character limit exceeded", (v) =>
  validateDosage(v)
);

// TC-031: Frequency Invalid
runTest("TC-031", "Frequency", "Invalid Input", "???", "Please enter a valid frequency", (v) =>
  validateFrequency(v)
);
// TC-032: Frequency Too Long
runTest("TC-032", "Frequency", "Too Long", "3".repeat(51), "Maximum allowed character limit exceeded", (v) =>
  validateFrequency(v)
);

// TC-033: Duration Invalid
runTest("TC-033", "Duration", "Invalid Input", "forever and ever", "Please enter a valid duration", (v) =>
  validateDuration(v)
);
// TC-034: Duration Too Long
runTest("TC-034", "Duration", "Too Long", "5".repeat(51), "Maximum allowed character limit exceeded", (v) =>
  validateDuration(v)
);

// Phase 4: Radiology (TC-035 - TC-036)
// TC-035: Radiology Notes Invalid
runTest("TC-035", "Radiology Notes", "Invalid Input", "<script>fetch('bad')</script>", "Please enter valid clinical notes / indications", (v) =>
  validateRadiologyNotes(v)
);
// TC-036: Radiology Notes Too Long
runTest("TC-036", "Radiology Notes", "Too Long", "R".repeat(501), "Clinical Notes / Indications exceeds the maximum allowed length", (v) =>
  validateRadiologyNotes(v)
);

// Phase 5: Recommend IP Admission (TC-037 - TC-046)
// TC-037: Primary Diagnosis Invalid
runTest("TC-037", "Primary Diagnosis", "Invalid Input", "   ", "Please enter a valid primary diagnosis", (v) =>
  validatePrimaryDiagnosis(v)
);
// TC-038: Primary Diagnosis Too Long
runTest("TC-038", "Primary Diagnosis", "Too Long", "P".repeat(201), "Maximum allowed character limit exceeded", (v) =>
  validatePrimaryDiagnosis(v)
);

// TC-039: Expected Stay Duration Invalid
runTest("TC-039", "Expected Stay Duration", "Invalid Input", "-5 days", "Please enter a valid expected stay duration", (v) =>
  validateExpectedStay(v)
);
// TC-040: Expected Stay Duration Too Long / Value
runTest("TC-040", "Expected Stay Duration", "Too Long / Value", "9999", "Expected stay duration exceeds the maximum allowed value", (v) =>
  validateExpectedStay(v)
);

// TC-041: Admission Reason Invalid
runTest("TC-041", "Admission Reason", "Invalid Input", "<iframe src='evil.com'>", "Please enter a valid admission reason", (v) =>
  validateAdmissionReason(v)
);
// TC-042: Admission Reason Too Long
runTest("TC-042", "Admission Reason", "Too Long", "A".repeat(501), "Maximum allowed character limit exceeded", (v) =>
  validateAdmissionReason(v)
);

// TC-043: Admission Clinical Notes Invalid
runTest("TC-043", "Admission Clinical Notes", "Invalid Input", "###$$$@@@", "Please enter valid clinical notes / diagnosis remarks", (v) =>
  validateAdmissionClinicalNotes(v)
);
// TC-044: Admission Clinical Notes Too Long
runTest("TC-044", "Admission Clinical Notes", "Too Long", "C".repeat(1001), "Maximum allowed character limit exceeded", (v) =>
  validateAdmissionClinicalNotes(v)
);

// TC-045: Special Instructions Invalid
runTest("TC-045", "Special Instructions", "Invalid Input", "javascript:alert(1)", "Please enter valid special instructions", (v) =>
  validateSpecialInstructions(v)
);
// TC-046: Special Instructions Too Long
runTest("TC-046", "Special Instructions", "Too Long", "I".repeat(1001), "Maximum allowed character limit exceeded", (v) =>
  validateSpecialInstructions(v)
);

// Output results table
console.log(`| Test ID | Field | Test Type | Passed | Expected Error | Actual Error |`);
console.log(`|---|---|---|---|---|---|`);
let passCount = 0;
for (const r of results) {
  if (r.passed) passCount++;
  console.log(
    `| ${r.id} | ${r.field} | ${r.testType} | ${r.passed ? "PASS" : "FAIL"} | ${r.expectedError.slice(0, 35)} | ${r.actualError?.slice(0, 35)} |`
  );
}

console.log(`\nTOTAL TEST CASES: ${results.length}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${results.length - passCount}`);
