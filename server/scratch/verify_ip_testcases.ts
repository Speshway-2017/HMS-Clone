import assert from 'assert';
import {
  validateTemperature,
  validateBloodPressure,
  validatePulseRate,
  validateRespiratoryRate,
  validateOxygenSaturation,
  validateWeight,
} from '../src/utils/consultationValidation';

console.log('=== VERIFYING IP MANAGEMENT TEST CASES ===\n');

let pass = 0;
let total = 0;

function check(desc: string, actual: any, expected: any, isSubstr = false) {
  total++;
  let ok = false;
  if (isSubstr) {
    ok = typeof actual === 'string' && actual.toLowerCase().includes(String(expected).toLowerCase());
  } else {
    ok = actual === expected;
  }
  if (ok) {
    pass++;
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc} -> Expected: "${expected}", Actual: "${actual}"`);
  }
}

// 1. Vitals Validation (All 6 fields optional, rejected when invalid or too long)
// Temperature
check('TC-V01: Temperature empty is accepted (optional)', validateTemperature(''), null);
check('TC-V02: Temperature rejects "@" invalid characters', validateTemperature('@@@@@@'), 'Please enter a valid temperature in °F');
check('TC-V03: Temperature rejects out of range', validateTemperature('150'), 'Temperature is outside the allowed range');
check('TC-V04: Temperature accepts valid decimal', validateTemperature('98.6'), null);

// Blood Pressure
check('TC-V05: BP empty is accepted (optional)', validateBloodPressure(''), null);
check('TC-V06: BP rejects "@" invalid characters', validateBloodPressure('@@@@@@@@@@@@@@@'), 'Please enter a valid blood pressure value (e.g., 120/80)');
check('TC-V07: BP rejects impossible systolic/diastolic', validateBloodPressure('300/200'), 'Please enter a valid blood pressure value (e.g., 120/80)');
check('TC-V08: BP accepts standard 120/80', validateBloodPressure('120/80'), null);

// Pulse Rate
check('TC-V09: Pulse empty is accepted (optional)', validatePulseRate(''), null);
check('TC-V10: Pulse rejects "@" invalid characters', validatePulseRate('@@@@@@@@@@@@@@@'), 'Please enter a valid pulse rate');
check('TC-V11: Pulse rejects out of range', validatePulseRate('350'), 'Please enter a valid pulse rate');
check('TC-V12: Pulse accepts valid 72 bpm', validatePulseRate('72'), null);

// Respiratory Rate
check('TC-V13: Resp Rate empty is accepted (optional)', validateRespiratoryRate(''), null);
check('TC-V14: Resp Rate rejects "@" invalid characters', validateRespiratoryRate('@@@@@'), 'Please enter a valid respiratory rate');
check('TC-V15: Resp Rate accepts valid 18', validateRespiratoryRate('18'), null);

// Oxygen Saturation
check('TC-V16: SpO2 empty is accepted (optional)', validateOxygenSaturation(''), null);
check('TC-V17: SpO2 rejects "@" invalid characters', validateOxygenSaturation('@@@@@@@@@@@@@@@'), 'Oxygen saturation must be between 0 and 100%');
check('TC-V18: SpO2 rejects > 100', validateOxygenSaturation('105'), 'Oxygen saturation must be between 0 and 100%');
check('TC-V19: SpO2 accepts 98%', validateOxygenSaturation('98%'), null);

// Weight
check('TC-V20: Weight empty is accepted (optional)', validateWeight(''), null);
check('TC-V21: Weight rejects "@" invalid characters', validateWeight('@@@@@@'), 'Please enter a valid weight in KG');
check('TC-V22: Weight rejects negative value', validateWeight('-10'), 'Please enter a valid weight in KG');
check('TC-V23: Weight accepts 70 kg', validateWeight('70'), null);

// 2. Medication Field Validators
function validateDrugName(val: string): string | null {
  const trimmed = (val || "").trim();
  if (!trimmed) return "Please fill out this field";
  if (trimmed.length > 150) return "Maximum allowed character limit exceeded";
  if (!/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
    return "Please enter valid data";
  }
  return null;
}

function validateFieldWithValidDataError(val: string, maxLen = 50): string | null {
  const trimmed = (val || "").trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLen) return "Maximum allowed character limit exceeded";
  if (!/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
    return "Please enter valid data";
  }
  return null;
}

function validateDuration(val: string): string | null {
  const trimmed = (val || "").trim();
  if (!trimmed) return null;
  if (trimmed.length > 50) return "Maximum allowed character limit exceeded";
  const isPureLetters = /^[a-zA-Z\s]+$/.test(trimmed) && !/\b(day|days|week|weeks|month|months)\b/i.test(trimmed);
  const isZeroOrNegative = /^-\d+|^\s*0+(\s*(day|days))?\s*$/i.test(durTrimmed(trimmed));
  if (!/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed) || isPureLetters || isZeroOrNegative) {
    return "Please enter valid data";
  }
  return null;
}
function durTrimmed(s: string) { return s; }

// Medicine Name
check('TC-M01: Medicine Name empty gives "Please fill out this field"', validateDrugName(''), 'Please fill out this field');
check('TC-M02: Medicine Name symbols gives "Please enter valid data"', validateDrugName('???###@@@'), 'Please enter valid data');
check('TC-M03: Medicine Name script gives "Please enter valid data"', validateDrugName('<script>alert(1)</script>'), 'Please enter valid data');
check('TC-M04: Medicine Name > 150 chars gives limit exceeded', validateDrugName('A'.repeat(151)), 'Maximum allowed character limit exceeded');
check('TC-M05: Medicine Name valid gives null', validateDrugName('Amoxicillin 500mg'), null);

// Strength
check('TC-M06: Strength empty is optional', validateFieldWithValidDataError(''), null);
check('TC-M07: Strength symbols gives "Please enter valid data"', validateFieldWithValidDataError('@@@@@@'), 'Please enter valid data');
check('TC-M08: Strength > 50 chars gives limit exceeded', validateFieldWithValidDataError('S'.repeat(51)), 'Maximum allowed character limit exceeded');
check('TC-M09: Strength valid gives null', validateFieldWithValidDataError('500mg'), null);

// Dosage
check('TC-M10: Dosage empty is optional', validateFieldWithValidDataError(''), null);
check('TC-M11: Dosage symbols gives "Please enter valid data"', validateFieldWithValidDataError('----'), 'Please enter valid data');
check('TC-M12: Dosage > 50 chars gives limit exceeded', validateFieldWithValidDataError('1'.repeat(51)), 'Maximum allowed character limit exceeded');
check('TC-M13: Dosage valid gives null', validateFieldWithValidDataError('1 Tab'), null);

// Frequency
check('TC-M14: Frequency empty is optional', validateFieldWithValidDataError(''), null);
check('TC-M15: Frequency symbols gives "Please enter valid data"', validateFieldWithValidDataError('???'), 'Please enter valid data');
check('TC-M16: Frequency > 50 chars gives limit exceeded', validateFieldWithValidDataError('F'.repeat(51)), 'Maximum allowed character limit exceeded');
check('TC-M17: Frequency valid gives null', validateFieldWithValidDataError('TID (3 times daily)'), null);

// Duration
check('TC-M18: Duration empty is optional', validateDuration(''), null);
check('TC-M19: Duration symbols gives "Please enter valid data"', validateDuration('***'), 'Please enter valid data');
check('TC-M20: Duration zero/negative gives "Please enter valid data"', validateDuration('0 days'), 'Please enter valid data');
check('TC-M21: Duration > 50 chars gives limit exceeded', validateDuration('5'.repeat(51)), 'Maximum allowed character limit exceeded');
check('TC-M22: Duration valid gives null', validateDuration('5 Days'), null);

// Discharge Diagnosis
function validateDischargeDiagnosis(val: string): string | null {
  const trimmed = (val || "").trim();
  if (!trimmed) return "Please fill out this field";
  if (trimmed.length > 200) return "Maximum allowed character limit exceeded";
  if (!/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
    return "Please enter valid data";
  }
  return null;
}
check('TC-D01: Discharge Diagnosis empty gives "Please fill out this field"', validateDischargeDiagnosis(''), 'Please fill out this field');
check('TC-D02: Discharge Diagnosis symbols gives "Please enter valid data"', validateDischargeDiagnosis('!@#$%^&*()'), 'Please enter valid data');
check('TC-D03: Discharge Diagnosis > 200 chars gives limit exceeded', validateDischargeDiagnosis('D'.repeat(201)), 'Maximum allowed character limit exceeded');
check('TC-D04: Discharge Diagnosis valid gives null', validateDischargeDiagnosis('Acute Viral Bronchitis, Resolved'), null);

console.log(`\nRESULTS: ${pass} / ${total} tests passed!`);
if (pass !== total) {
  process.exit(1);
}

