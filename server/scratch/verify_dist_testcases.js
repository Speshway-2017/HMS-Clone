const val = require('../dist/utils/consultationValidation.js');

const tests = [
  // Phase 1: TC-001 - TC-012
  { id: 'TC-001', field: 'Chief Complaint', type: 'Invalid Input', fn: () => val.validateClinicalText('<script>alert(1)</script>', 'Chief Complaint', val.CONSULTATION_LIMITS.CHIEF_COMPLAINT), exp: 'Please enter valid data' },
  { id: 'TC-002', field: 'Chief Complaint', type: 'Too Long', fn: () => val.validateClinicalText('A'.repeat(501), 'Chief Complaint', val.CONSULTATION_LIMITS.CHIEF_COMPLAINT), exp: 'Maximum allowed character limit exceeded' },
  { id: 'TC-003', field: 'Diagnosis', type: 'Invalid / Required', fn: () => val.validateClinicalText('   ', 'Diagnosis', val.CONSULTATION_LIMITS.DIAGNOSIS, true), exp: 'Diagnosis is required' },
  { id: 'TC-004', field: 'Diagnosis', type: 'Too Long', fn: () => val.validateClinicalText('D'.repeat(201), 'Diagnosis', val.CONSULTATION_LIMITS.DIAGNOSIS, true), exp: 'Maximum allowed character limit exceeded' },
  { id: 'TC-005', field: 'Symptoms', type: 'Invalid Input', fn: () => val.validateClinicalText('javascript:void(0)', 'Symptoms', val.CONSULTATION_LIMITS.SYMPTOMS), exp: 'Please enter valid data' },
  { id: 'TC-006', field: 'Symptoms', type: 'Too Long', fn: () => val.validateClinicalText('S'.repeat(501), 'Symptoms', val.CONSULTATION_LIMITS.SYMPTOMS), exp: 'Maximum allowed character limit exceeded' },
  { id: 'TC-007', field: 'Clinical Notes', type: 'Invalid Input', fn: () => val.validateClinicalText('<style>test</style>', 'Clinical Notes', val.CONSULTATION_LIMITS.CLINICAL_NOTES), exp: 'Please enter valid data' },
  { id: 'TC-008', field: 'Clinical Notes', type: 'Too Long', fn: () => val.validateClinicalText('C'.repeat(1001), 'Clinical Notes', val.CONSULTATION_LIMITS.CLINICAL_NOTES), exp: 'Maximum allowed character limit exceeded' },
  { id: 'TC-009', field: 'Treatment Plan', type: 'Invalid Input', fn: () => val.validateClinicalText('!@#$%^&*()_+', 'Treatment Plan', val.CONSULTATION_LIMITS.TREATMENT_PLAN), exp: 'Please enter valid data' },
  { id: 'TC-010', field: 'Treatment Plan', type: 'Too Long', fn: () => val.validateClinicalText('T'.repeat(1001), 'Treatment Plan', val.CONSULTATION_LIMITS.TREATMENT_PLAN), exp: 'Maximum allowed character limit exceeded' },
  { id: 'TC-011', field: 'Advice / Follow-up Notes', type: 'Invalid Input', fn: () => val.validateClinicalText('<svg onload=1>', 'Advice / Follow-up Notes', val.CONSULTATION_LIMITS.ADVICE), exp: 'Please enter valid data' },
  { id: 'TC-012', field: 'Advice / Follow-up Notes', type: 'Too Long', fn: () => val.validateClinicalText('A'.repeat(501), 'Advice / Follow-up Notes', val.CONSULTATION_LIMITS.ADVICE), exp: 'Maximum allowed character limit exceeded' },

  // Phase 2: TC-013 - TC-024
  { id: 'TC-013', field: 'Temperature', type: 'Invalid Input', fn: () => val.validateTemperature('98.6F'), exp: 'Please enter a valid temperature in °F' },
  { id: 'TC-014', field: 'Temperature', type: 'Too Long / Range', fn: () => val.validateTemperature('125.0'), exp: 'Temperature is outside the allowed range' },
  { id: 'TC-015', field: 'Blood Pressure', type: 'Invalid Input', fn: () => val.validateBloodPressure('120-80'), exp: 'Please enter a valid blood pressure value' },
  { id: 'TC-016', field: 'Blood Pressure', type: 'Too Long / Limits', fn: () => val.validateBloodPressure('350/200'), exp: 'Please enter a valid blood pressure value' },
  { id: 'TC-017', field: 'Pulse Rate', type: 'Invalid Input', fn: () => val.validatePulseRate('seventy'), exp: 'Please enter a valid pulse rate' },
  { id: 'TC-018', field: 'Pulse Rate', type: 'Too Long / Range', fn: () => val.validatePulseRate('350'), exp: 'Please enter a valid pulse rate' },
  { id: 'TC-019', field: 'Respiratory Rate', type: 'Invalid Input', fn: () => val.validateRespiratoryRate('16bpm'), exp: 'Please enter a valid respiratory rate' },
  { id: 'TC-020', field: 'Respiratory Rate', type: 'Too Long / Range', fn: () => val.validateRespiratoryRate('99'), exp: 'Please enter a valid respiratory rate' },
  { id: 'TC-021', field: 'Oxygen Saturation', type: 'Invalid Input', fn: () => val.validateOxygenSaturation('high%'), exp: 'Oxygen saturation must be between 0 and 100%' },
  { id: 'TC-022', field: 'Oxygen Saturation', type: 'Too Long / Range', fn: () => val.validateOxygenSaturation('120'), exp: 'Oxygen saturation must be between 0 and 100%' },
  { id: 'TC-023', field: 'Weight', type: 'Invalid Input', fn: () => val.validateWeight('seventy'), exp: 'Please enter a valid weight in KG' },
  { id: 'TC-024', field: 'Weight', type: 'Too Long / Range', fn: () => val.validateWeight('-10'), exp: 'Please enter a valid weight in KG' },

  // Phase 3: TC-025 - TC-034
  { id: 'TC-025', field: 'Medicine Name', type: 'Invalid Input', fn: () => val.validateMedicineName('???###$$$'), exp: 'Please enter a valid medicine name' },
  { id: 'TC-026', field: 'Medicine Name', type: 'Too Long', fn: () => val.validateMedicineName('M'.repeat(151)), exp: 'Maximum allowed character limit exceeded' },
  { id: 'TC-027', field: 'Custom Strength', type: 'Invalid Input', fn: () => val.validateMedicineStrength('   ', true), exp: 'Please enter a valid medicine strength' },
  { id: 'TC-028', field: 'Custom Strength', type: 'Too Long', fn: () => val.validateMedicineStrength('5'.repeat(51), true), exp: 'Maximum allowed character limit exceeded' },
  { id: 'TC-029', field: 'Dosage', type: 'Invalid Input', fn: () => val.validateDosage('---'), exp: 'Please enter a valid dosage' },
  { id: 'TC-030', field: 'Dosage', type: 'Too Long', fn: () => val.validateDosage('1'.repeat(51)), exp: 'Maximum allowed character limit exceeded' },
  { id: 'TC-031', field: 'Frequency', type: 'Invalid Input', fn: () => val.validateFrequency('???'), exp: 'Please enter a valid frequency' },
  { id: 'TC-032', field: 'Frequency', type: 'Too Long', fn: () => val.validateFrequency('3'.repeat(51)), exp: 'Maximum allowed character limit exceeded' },
  { id: 'TC-033', field: 'Duration', type: 'Invalid Input', fn: () => val.validateDuration('forever and ever'), exp: 'Please enter a valid duration' },
  { id: 'TC-034', field: 'Duration', type: 'Too Long', fn: () => val.validateDuration('5'.repeat(51)), exp: 'Maximum allowed character limit exceeded' },

  // Phase 4: TC-035 - TC-036
  { id: 'TC-035', field: 'Radiology Notes', type: 'Invalid Input', fn: () => val.validateRadiologyNotes('<script>fetch(1)</script>'), exp: 'Please enter valid clinical notes / indications' },
  { id: 'TC-036', field: 'Radiology Notes', type: 'Too Long', fn: () => val.validateRadiologyNotes('R'.repeat(501)), exp: 'Clinical Notes / Indications exceeds the maximum allowed length' },

  // Phase 5: TC-037 - TC-046
  { id: 'TC-037', field: 'Primary Diagnosis', type: 'Invalid Input', fn: () => val.validatePrimaryDiagnosis('   '), exp: 'Please enter a valid primary diagnosis' },
  { id: 'TC-038', field: 'Primary Diagnosis', type: 'Too Long', fn: () => val.validatePrimaryDiagnosis('P'.repeat(201)), exp: 'Maximum allowed character limit exceeded' },
  { id: 'TC-039', field: 'Expected Stay Duration', type: 'Invalid Input', fn: () => val.validateExpectedStay('-5 days'), exp: 'Please enter a valid expected stay duration' },
  { id: 'TC-040', field: 'Expected Stay Duration', type: 'Too Long / Value', fn: () => val.validateExpectedStay('9999'), exp: 'Expected stay duration exceeds the maximum allowed value' },
  { id: 'TC-041', field: 'Admission Reason', type: 'Invalid Input', fn: () => val.validateAdmissionReason('<iframe src=1>'), exp: 'Please enter a valid admission reason' },
  { id: 'TC-042', field: 'Admission Reason', type: 'Too Long', fn: () => val.validateAdmissionReason('A'.repeat(501)), exp: 'Maximum allowed character limit exceeded' },
  { id: 'TC-043', field: 'Admission Clinical Notes', type: 'Invalid Input', fn: () => val.validateAdmissionClinicalNotes('###$$$@@@'), exp: 'Please enter valid clinical notes / diagnosis remarks' },
  { id: 'TC-044', field: 'Admission Clinical Notes', type: 'Too Long', fn: () => val.validateAdmissionClinicalNotes('C'.repeat(1001)), exp: 'Maximum allowed character limit exceeded' },
  { id: 'TC-045', field: 'Special Instructions', type: 'Invalid Input', fn: () => val.validateSpecialInstructions('javascript:alert(1)'), exp: 'Please enter valid special instructions' },
  { id: 'TC-046', field: 'Special Instructions', type: 'Too Long', fn: () => val.validateSpecialInstructions('I'.repeat(1001)), exp: 'Maximum allowed character limit exceeded' }
];

let pass = 0;
tests.forEach(t => {
  const err = t.fn();
  const ok = err && err.toLowerCase().includes(t.exp.toLowerCase());
  if (ok) pass++;
  console.log(t.id + ' | ' + t.field + ' | ' + t.type + ' | ' + (ok ? 'PASS' : 'FAIL') + ' | ' + err);
});
console.log('\nResults: ' + pass + ' / ' + tests.length + ' PASSED');
