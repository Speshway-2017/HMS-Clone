const fs = require('fs');

let code = fs.readFileSync('server/src/controllers/doctorDashboardController.ts', 'utf8');

// 1. Add imports if not present
if (!code.includes('consultationValidation')) {
  code = code.replace(
    'import { createOrUpdatePrescriptionCore, formatAndSanitizeMedications } from "./prescriptionController";',
    'import { createOrUpdatePrescriptionCore, formatAndSanitizeMedications } from "./prescriptionController";\n' +
    'import {\n' +
    '  CONSULTATION_LIMITS,\n' +
    '  validateClinicalText,\n' +
    '  validateTemperature,\n' +
    '  validateBloodPressure,\n' +
    '  validatePulseRate,\n' +
    '  validateRespiratoryRate,\n' +
    '  validateOxygenSaturation,\n' +
    '  validateWeight,\n' +
    '  validateMedicineName,\n' +
    '  validateMedicineStrength,\n' +
    '  validateDosage,\n' +
    '  validateFrequency,\n' +
    '  validateDuration,\n' +
    '  validateRadiologyNotes,\n' +
    '  validatePrimaryDiagnosis,\n' +
    '  validateExpectedStay,\n' +
    '  validateAdmissionReason,\n' +
    '  validateAdmissionClinicalNotes,\n' +
    '  validateSpecialInstructions,\n' +
    '} from "../utils/consultationValidation";'
  );
}

// Normalize line endings for replacement
const isCRLF = code.includes('\r\n');
const toFileFormat = (str) => (isCRLF ? str.replace(/\r?\n/g, '\r\n') : str.replace(/\r\n/g, '\n'));

// 2. createPrescription: validate medications
const presTarget = '  // Format medications from old medicines format or new medications format\n  const rawMeds = medicines || req.body.medications || [];';
const presReplacement = 
'  // Format medications from old medicines format or new medications format\n' +
'  const rawMeds = medicines || req.body.medications || [];\n' +
'  if (rawMeds.length === 0) {\n' +
'    throw new AppError("Please enter a valid medicine name", 400);\n' +
'  }\n' +
'  for (const m of rawMeds) {\n' +
'    const nameErr = validateMedicineName(m.name || m.medicineName);\n' +
'    if (nameErr) throw new AppError(nameErr, 400);\n' +
'    if (m.strength) {\n' +
'      const strErr = validateMedicineStrength(m.strength);\n' +
'      if (strErr) throw new AppError(strErr, 400);\n' +
'    }\n' +
'    if (m.dosage) {\n' +
'      const dosErr = validateDosage(m.dosage);\n' +
'      if (dosErr) throw new AppError(dosErr, 400);\n' +
'    }\n' +
'    if (m.frequency) {\n' +
'      const freqErr = validateFrequency(m.frequency);\n' +
'      if (freqErr) throw new AppError(freqErr, 400);\n' +
'    }\n' +
'    if (m.duration) {\n' +
'      const durErr = validateDuration(m.duration);\n' +
'      if (durErr) throw new AppError(durErr, 400);\n' +
'    }\n' +
'  }';

if (code.includes(toFileFormat(presTarget))) {
  code = code.replace(toFileFormat(presTarget), toFileFormat(presReplacement));
} else {
  console.log('WARNING: presTarget not matched');
}

// 3. saveVitals validation
const vitTarget = '  const { vitals, chiefComplaint } = req.body;\n  const doctor = await getLoggedDoctor(req);';
const vitReplacement =
'  const { vitals, chiefComplaint } = req.body;\n' +
'  const doctor = await getLoggedDoctor(req);\n\n' +
'  if (chiefComplaint) {\n' +
'    const err = validateClinicalText(chiefComplaint, "Chief Complaint", CONSULTATION_LIMITS.CHIEF_COMPLAINT);\n' +
'    if (err) throw new AppError(err, 400);\n' +
'  }\n' +
'  if (vitals) {\n' +
'    if (vitals.temperature) {\n' +
'      const err = validateTemperature(vitals.temperature);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (vitals.bloodPressure) {\n' +
'      const err = validateBloodPressure(vitals.bloodPressure);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (vitals.pulseRate) {\n' +
'      const err = validatePulseRate(vitals.pulseRate);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (vitals.respiratoryRate) {\n' +
'      const err = validateRespiratoryRate(vitals.respiratoryRate);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (vitals.oxygenSaturation) {\n' +
'      const err = validateOxygenSaturation(vitals.oxygenSaturation);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (vitals.weight) {\n' +
'      const err = validateWeight(vitals.weight);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'  }';

if (code.includes(toFileFormat(vitTarget))) {
  code = code.replace(toFileFormat(vitTarget), toFileFormat(vitReplacement));
} else {
  console.log('WARNING: vitTarget not matched');
}

// 4. saveClinicalNotes validation
const clinTarget = '  const { diagnosis, symptoms, clinicalNotes, treatmentPlan, advice } = req.body;\n  const doctor = await getLoggedDoctor(req);';
const clinReplacement =
'  const { diagnosis, symptoms, clinicalNotes, treatmentPlan, advice, chiefComplaint } = req.body;\n' +
'  const doctor = await getLoggedDoctor(req);\n\n' +
'  const diagErr = validateClinicalText(diagnosis, "Diagnosis", CONSULTATION_LIMITS.DIAGNOSIS, true);\n' +
'  if (diagErr) throw new AppError(diagErr, 400);\n' +
'  if (chiefComplaint) {\n' +
'    const err = validateClinicalText(chiefComplaint, "Chief Complaint", CONSULTATION_LIMITS.CHIEF_COMPLAINT);\n' +
'    if (err) throw new AppError(err, 400);\n' +
'  }\n' +
'  if (symptoms) {\n' +
'    const err = validateClinicalText(symptoms, "Symptoms", CONSULTATION_LIMITS.SYMPTOMS);\n' +
'    if (err) throw new AppError(err, 400);\n' +
'  }\n' +
'  if (clinicalNotes) {\n' +
'    const err = validateClinicalText(clinicalNotes, "Clinical Notes", CONSULTATION_LIMITS.CLINICAL_NOTES);\n' +
'    if (err) throw new AppError(err, 400);\n' +
'  }\n' +
'  if (treatmentPlan) {\n' +
'    const err = validateClinicalText(treatmentPlan, "Treatment Plan", CONSULTATION_LIMITS.TREATMENT_PLAN);\n' +
'    if (err) throw new AppError(err, 400);\n' +
'  }\n' +
'  if (advice) {\n' +
'    const err = validateClinicalText(advice, "Advice / Follow-up Notes", CONSULTATION_LIMITS.ADVICE);\n' +
'    if (err) throw new AppError(err, 400);\n' +
'  }';

if (code.includes(toFileFormat(clinTarget))) {
  code = code.replace(toFileFormat(clinTarget), toFileFormat(clinReplacement));
} else {
  console.log('WARNING: clinTarget not matched');
}

// 5. recommendAdmission validation
const admTarget = '  if (!primaryDiagnosis || !primaryDiagnosis.trim()) {\n    throw new AppError("Diagnosis is mandatory for admission recommendation.", 400);\n  }';
const admReplacement =
'  const diagErr = validatePrimaryDiagnosis(primaryDiagnosis);\n' +
'  if (diagErr) throw new AppError(diagErr, 400);\n' +
'  if (expectedStay) {\n' +
'    const stayErr = validateExpectedStay(expectedStay);\n' +
'    if (stayErr) throw new AppError(stayErr, 400);\n' +
'  }\n' +
'  if (admissionReason) {\n' +
'    const reasonErr = validateAdmissionReason(admissionReason);\n' +
'    if (reasonErr) throw new AppError(reasonErr, 400);\n' +
'  }\n' +
'  if (clinicalNotes) {\n' +
'    const notesErr = validateAdmissionClinicalNotes(clinicalNotes);\n' +
'    if (notesErr) throw new AppError(notesErr, 400);\n' +
'  }\n' +
'  if (specialInstructions) {\n' +
'    const instErr = validateSpecialInstructions(specialInstructions);\n' +
'    if (instErr) throw new AppError(instErr, 400);\n' +
'  }';

if (code.includes(toFileFormat(admTarget))) {
  code = code.replace(toFileFormat(admTarget), toFileFormat(admReplacement));
} else {
  console.log('WARNING: admTarget not matched');
}

// 6. createRadiologyOrder validation
const radTarget = '  let targetBranch = doctor.branch || req.hospitalFilter?.branch || (req.user as any)?.branch || null;';
const radReplacement =
'  if (notes) {\n' +
'    const notesErr = validateRadiologyNotes(notes);\n' +
'    if (notesErr) throw new AppError(notesErr, 400);\n' +
'  }\n' +
'  let targetBranch = doctor.branch || req.hospitalFilter?.branch || (req.user as any)?.branch || null;';

if (code.includes(toFileFormat(radTarget))) {
  code = code.replace(toFileFormat(radTarget), toFileFormat(radReplacement));
} else {
  console.log('WARNING: radTarget not matched');
}

// 7. updateConsultationDraft validation
const draftTarget = '  const updateData = { ...req.body };\n  if (Array.isArray(updateData.prescriptions)) {\n    updateData.prescriptions = formatAndSanitizeMedications(updateData.prescriptions);\n  }';
const draftReplacement =
'  const updateData = { ...req.body };\n' +
'  if (updateData.chiefComplaint) {\n' +
'    const err = validateClinicalText(updateData.chiefComplaint, "Chief Complaint", CONSULTATION_LIMITS.CHIEF_COMPLAINT);\n' +
'    if (err) throw new AppError(err, 400);\n' +
'  }\n' +
'  if (updateData.diagnosis) {\n' +
'    const err = validateClinicalText(updateData.diagnosis, "Diagnosis", CONSULTATION_LIMITS.DIAGNOSIS);\n' +
'    if (err) throw new AppError(err, 400);\n' +
'  }\n' +
'  if (updateData.symptoms) {\n' +
'    const err = validateClinicalText(updateData.symptoms, "Symptoms", CONSULTATION_LIMITS.SYMPTOMS);\n' +
'    if (err) throw new AppError(err, 400);\n' +
'  }\n' +
'  if (updateData.clinicalNotes) {\n' +
'    const err = validateClinicalText(updateData.clinicalNotes, "Clinical Notes", CONSULTATION_LIMITS.CLINICAL_NOTES);\n' +
'    if (err) throw new AppError(err, 400);\n' +
'  }\n' +
'  if (updateData.treatmentPlan) {\n' +
'    const err = validateClinicalText(updateData.treatmentPlan, "Treatment Plan", CONSULTATION_LIMITS.TREATMENT_PLAN);\n' +
'    if (err) throw new AppError(err, 400);\n' +
'  }\n' +
'  if (updateData.advice) {\n' +
'    const err = validateClinicalText(updateData.advice, "Advice / Follow-up Notes", CONSULTATION_LIMITS.ADVICE);\n' +
'    if (err) throw new AppError(err, 400);\n' +
'  }\n' +
'  if (updateData.vitals) {\n' +
'    const v = updateData.vitals;\n' +
'    if (v.temperature) {\n' +
'      const err = validateTemperature(v.temperature);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (v.bloodPressure) {\n' +
'      const err = validateBloodPressure(v.bloodPressure);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (v.pulseRate) {\n' +
'      const err = validatePulseRate(v.pulseRate);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (v.respiratoryRate) {\n' +
'      const err = validateRespiratoryRate(v.respiratoryRate);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (v.oxygenSaturation) {\n' +
'      const err = validateOxygenSaturation(v.oxygenSaturation);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (v.weight) {\n' +
'      const err = validateWeight(v.weight);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'  }\n' +
'  if (Array.isArray(updateData.prescriptions)) {\n' +
'    for (const m of updateData.prescriptions) {\n' +
'      if (m.name) {\n' +
'        const err = validateMedicineName(m.name);\n' +
'        if (err) throw new AppError(err, 400);\n' +
'      }\n' +
'      if (m.strength) {\n' +
'        const err = validateMedicineStrength(m.strength);\n' +
'        if (err) throw new AppError(err, 400);\n' +
'      }\n' +
'      if (m.dosage) {\n' +
'        const err = validateDosage(m.dosage);\n' +
'        if (err) throw new AppError(err, 400);\n' +
'      }\n' +
'      if (m.frequency) {\n' +
'        const err = validateFrequency(m.frequency);\n' +
'        if (err) throw new AppError(err, 400);\n' +
'      }\n' +
'      if (m.duration) {\n' +
'        const err = validateDuration(m.duration);\n' +
'        if (err) throw new AppError(err, 400);\n' +
'      }\n' +
'    }\n' +
'    updateData.prescriptions = formatAndSanitizeMedications(updateData.prescriptions);\n' +
'  }\n' +
'  if (Array.isArray(updateData.radiologyOrders)) {\n' +
'    for (const r of updateData.radiologyOrders) {\n' +
'      if (r.notes) {\n' +
'        const err = validateRadiologyNotes(r.notes);\n' +
'        if (err) throw new AppError(err, 400);\n' +
'      }\n' +
'    }\n' +
'  }\n' +
'  if (updateData.admissionRecommendation) {\n' +
'    const adm = updateData.admissionRecommendation;\n' +
'    if (adm.primaryDiagnosis) {\n' +
'      const err = validatePrimaryDiagnosis(adm.primaryDiagnosis);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (adm.expectedStay) {\n' +
'      const err = validateExpectedStay(adm.expectedStay);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (adm.admissionReason) {\n' +
'      const err = validateAdmissionReason(adm.admissionReason);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (adm.clinicalNotes) {\n' +
'      const err = validateAdmissionClinicalNotes(adm.clinicalNotes);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'    if (adm.specialInstructions) {\n' +
'      const err = validateSpecialInstructions(adm.specialInstructions);\n' +
'      if (err) throw new AppError(err, 400);\n' +
'    }\n' +
'  }';

if (code.includes(toFileFormat(draftTarget))) {
  code = code.replace(toFileFormat(draftTarget), toFileFormat(draftReplacement));
} else {
  console.log('WARNING: draftTarget not matched');
}

// 8. completeConsultationSession validation
const compTarget = '  if (!draft.diagnosis || !draft.diagnosis.trim()) {\n    throw new AppError("Diagnosis is mandatory to complete the consultation.", 400);\n  }';
const compReplacement =
'  const diagErr = validateClinicalText(draft.diagnosis, "Diagnosis", CONSULTATION_LIMITS.DIAGNOSIS, true);\n' +
'  if (diagErr) {\n' +
'    throw new AppError(diagErr, 400);\n' +
'  }';

if (code.includes(toFileFormat(compTarget))) {
  code = code.replace(toFileFormat(compTarget), toFileFormat(compReplacement));
} else {
  console.log('WARNING: compTarget not matched');
}

fs.writeFileSync('server/src/controllers/doctorDashboardController.ts', code);
console.log('doctorDashboardController.ts successfully patched!');
