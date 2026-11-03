const fs = require('fs');

let code = fs.readFileSync('client/src/pages/doctor/ConsultationWorkspacePage.tsx', 'utf8');

const isCRLF = code.includes('\r\n');
const toFileFormat = (str) => (isCRLF ? str.replace(/\r?\n/g, '\r\n') : str.replace(/\r\n/g, '\n'));

// 1. Add imports
if (!code.includes('consultationValidation')) {
  code = code.replace(
    'import { useMedicineVariants, useHospitalMedicines } from "../../features/medicines";',
    'import { useMedicineVariants, useHospitalMedicines } from "../../features/medicines";\n' +
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
    '} from "../../utils/consultationValidation";'
  );
}

// 2. MedicineStrengthSelect props and error display
const oldSelect = 
`function MedicineStrengthSelect({
  medicineName,
  value,
  onChange,
}: {
  medicineName: string;
  value: string;
  onChange: (val: string) => void;
}) {`;

const newSelect = 
`function MedicineStrengthSelect({
  medicineName,
  value,
  onChange,
  error,
}: {
  medicineName: string;
  value: string;
  onChange: (val: string) => void;
  error?: string | null;
}) {`;

if (code.includes(toFileFormat(oldSelect))) {
  code = code.replace(toFileFormat(oldSelect), toFileFormat(newSelect));
}

// Update MedicineStrengthSelect returns to show error and limit
const oldSelectCustomReturn = 
`        <div className="flex gap-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. 500mg"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-100"
          />
          {hasVariants && (
            <button
              type="button"
              onClick={() => { setIsCustom(false); onChange(""); }}
              className="text-[9px] text-navy-700 hover:underline whitespace-nowrap font-bold"
              title="Switch back to dropdown"
            >
              ↩ List
            </button>
          )}
        </div>
      </div>`;

const newSelectCustomReturn = 
`        <div className="flex gap-1">
          <input
            type="text"
            value={value}
            maxLength={CONSULTATION_LIMITS.MEDICINE_STRENGTH}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. 500mg"
            className={\`w-full rounded-xl border \${error ? "border-red-500 bg-red-50/20" : "border-slate-200 bg-white"} px-3 py-2 text-xs outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-100\`}
          />
          {hasVariants && (
            <button
              type="button"
              onClick={() => { setIsCustom(false); onChange(""); }}
              className="text-[9px] text-navy-700 hover:underline whitespace-nowrap font-bold"
              title="Switch back to dropdown"
            >
              ↩ List
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-[11px] text-red-600 font-medium leading-tight">{error}</p>}
      </div>`;

if (code.includes(toFileFormat(oldSelectCustomReturn))) {
  code = code.replace(toFileFormat(oldSelectCustomReturn), toFileFormat(newSelectCustomReturn));
}

// 3. Add error states in ConsultationWorkspacePage
const stateTarget = `  // Admission form state
  const { data: wardsData } = useWards({ limit: 100 });`;

const stateAddition = 
`  // Validation error states - Phase 1: Clinical Assessment Notes
  const [chiefComplaintError, setChiefComplaintError] = useState<string | null>(null);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [symptomsError, setSymptomsError] = useState<string | null>(null);
  const [clinicalNotesError, setClinicalNotesError] = useState<string | null>(null);
  const [treatmentPlanError, setTreatmentPlanError] = useState<string | null>(null);
  const [adviceError, setAdviceError] = useState<string | null>(null);

  // Validation error states - Phase 2: Patient Vitals
  const [temperatureError, setTemperatureError] = useState<string | null>(null);
  const [bloodPressureError, setBloodPressureError] = useState<string | null>(null);
  const [pulseRateError, setPulseRateError] = useState<string | null>(null);
  const [respiratoryRateError, setRespiratoryRateError] = useState<string | null>(null);
  const [oxygenSaturationError, setOxygenSaturationError] = useState<string | null>(null);
  const [weightError, setWeightError] = useState<string | null>(null);

  // Validation error states - Phase 3: Medication
  const [medErrors, setMedErrors] = useState<Record<number, Record<string, string | null>>>({});

  // Validation error states - Phase 4: Radiology
  const [radioNotesError, setRadioNotesError] = useState<string | null>(null);

  // Validation error states - Phase 5: Recommend Admission
  const [admitDiagnosisError, setAdmitDiagnosisError] = useState<string | null>(null);
  const [admitExpectedStayError, setAdmitExpectedStayError] = useState<string | null>(null);
  const [admitReasonError, setAdmitReasonError] = useState<string | null>(null);
  const [admitNotesError, setAdmitNotesError] = useState<string | null>(null);
  const [admitSpecialInstructionsError, setAdmitSpecialInstructionsError] = useState<string | null>(null);

  // Admission form state
  const { data: wardsData } = useWards({ limit: 100 });`;

if (code.includes(toFileFormat(stateTarget))) {
  code = code.replace(toFileFormat(stateTarget), toFileFormat(stateAddition));
} else {
  console.log('WARNING: stateTarget not matched');
}

// 4. Update handleSaveVitals
const oldSaveVitals = 
`  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    try {`;

const newSaveVitals = 
`  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    const tErr = validateTemperature(temperature);
    const bpErr = validateBloodPressure(bloodPressure);
    const prErr = validatePulseRate(pulseRate);
    const rrErr = validateRespiratoryRate(respiratoryRate);
    const o2Err = validateOxygenSaturation(oxygenSaturation);
    const wErr = validateWeight(weight);

    setTemperatureError(tErr);
    setBloodPressureError(bpErr);
    setPulseRateError(prErr);
    setRespiratoryRateError(rrErr);
    setOxygenSaturationError(o2Err);
    setWeightError(wErr);

    const firstErr = tErr || bpErr || prErr || rrErr || o2Err || wErr;
    if (firstErr) {
      toast.error(firstErr);
      return;
    }
    try {`;

if (code.includes(toFileFormat(oldSaveVitals))) {
  code = code.replace(toFileFormat(oldSaveVitals), toFileFormat(newSaveVitals));
} else {
  console.log('WARNING: oldSaveVitals not matched');
}

// 5. Update handleSaveClinicalNotes
const oldSaveNotes = 
`  const handleSaveClinicalNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    try {`;

const newSaveNotes = 
`  const handleSaveClinicalNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    const dErr = validateClinicalText(diagnosis, "Diagnosis", CONSULTATION_LIMITS.DIAGNOSIS, true);
    const ccErr = validateClinicalText(chiefComplaint, "Chief Complaint", CONSULTATION_LIMITS.CHIEF_COMPLAINT);
    const sErr = validateClinicalText(symptoms, "Symptoms", CONSULTATION_LIMITS.SYMPTOMS);
    const cnErr = validateClinicalText(clinicalNotes, "Clinical Notes", CONSULTATION_LIMITS.CLINICAL_NOTES);
    const tpErr = validateClinicalText(treatmentPlan, "Treatment Plan", CONSULTATION_LIMITS.TREATMENT_PLAN);
    const aErr = validateClinicalText(advice, "Advice / Follow-up Notes", CONSULTATION_LIMITS.ADVICE);

    setDiagnosisError(dErr);
    setChiefComplaintError(ccErr);
    setSymptomsError(sErr);
    setClinicalNotesError(cnErr);
    setTreatmentPlanError(tpErr);
    setAdviceError(aErr);

    const firstErr = dErr || ccErr || sErr || cnErr || tpErr || aErr;
    if (firstErr) {
      toast.error(firstErr);
      return;
    }
    try {`;

if (code.includes(toFileFormat(oldSaveNotes))) {
  code = code.replace(toFileFormat(oldSaveNotes), toFileFormat(newSaveNotes));
} else {
  console.log('WARNING: oldSaveNotes not matched');
}

// 6. Update handleGeneratePrescription
const oldPresSubmit = 
`    if (validMeds.length === 0) {
      toast.error("Please enter at least one valid medicine name");
      return;
    }

    try {`;

const newPresSubmit = 
`    if (validMeds.length === 0) {
      toast.error("Please enter at least one valid medicine name");
      return;
    }

    let hasMedErr = false;
    const newErrors: Record<number, Record<string, string | null>> = {};
    for (let i = 0; i < prescriptionMeds.length; i++) {
      const m = prescriptionMeds[i];
      const nameErr = validateMedicineName(m.name || m.medicineName);
      const strErr = validateMedicineStrength(m.strength);
      const dosErr = validateDosage(m.dosage);
      const freqErr = validateFrequency(m.frequency);
      const durErr = validateDuration(m.duration);
      if (nameErr || strErr || dosErr || freqErr || durErr) {
        hasMedErr = true;
        newErrors[i] = {
          name: nameErr,
          strength: strErr,
          dosage: dosErr,
          frequency: freqErr,
          duration: durErr,
        };
      }
    }
    setMedErrors(newErrors);
    if (hasMedErr) {
      const firstRow = Object.values(newErrors)[0];
      const firstErrMsg = firstRow.name || firstRow.strength || firstRow.dosage || firstRow.frequency || firstRow.duration;
      if (firstErrMsg) toast.error(firstErrMsg);
      return;
    }

    try {`;

if (code.includes(toFileFormat(oldPresSubmit))) {
  code = code.replace(toFileFormat(oldPresSubmit), toFileFormat(newPresSubmit));
} else {
  console.log('WARNING: oldPresSubmit not matched');
}

// 7. Update handleOrderRadiology
const oldRadSubmit = 
`  const handleOrderRadiology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    if (selectedRadiologyStudies.length === 0) {
      toast.error("Please select at least one radiology study.");
      return;
    }
    try {`;

const newRadSubmit = 
`  const handleOrderRadiology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    if (selectedRadiologyStudies.length === 0) {
      toast.error("Please select at least one radiology study.");
      return;
    }
    const rErr = validateRadiologyNotes(radioNotes);
    setRadioNotesError(rErr);
    if (rErr) {
      toast.error(rErr);
      return;
    }
    try {`;

if (code.includes(toFileFormat(oldRadSubmit))) {
  code = code.replace(toFileFormat(oldRadSubmit), toFileFormat(newRadSubmit));
} else {
  console.log('WARNING: oldRadSubmit not matched');
}

// 8. Update handleRecommendAdmission
const oldAdmSubmit = 
`  const handleRecommendAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    try {`;

const newAdmSubmit = 
`  const handleRecommendAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceData?.draftSession) {
      toast.error("No active draft session. Please start consultation.");
      return;
    }
    const dErr = validatePrimaryDiagnosis(admitDiagnosis);
    const sErr = validateExpectedStay(admitExpectedStay);
    const rErr = validateAdmissionReason(admitReason);
    const nErr = validateAdmissionClinicalNotes(admitNotes);
    const iErr = validateSpecialInstructions(admitSpecialInstructions);

    setAdmitDiagnosisError(dErr);
    setAdmitExpectedStayError(sErr);
    setAdmitReasonError(rErr);
    setAdmitNotesError(nErr);
    setAdmitSpecialInstructionsError(iErr);

    const firstErr = dErr || sErr || rErr || nErr || iErr;
    if (firstErr) {
      toast.error(firstErr);
      return;
    }
    try {`;

if (code.includes(toFileFormat(oldAdmSubmit))) {
  code = code.replace(toFileFormat(oldAdmSubmit), toFileFormat(newAdmSubmit));
} else {
  console.log('WARNING: oldAdmSubmit not matched');
}

fs.writeFileSync('client/src/pages/doctor/ConsultationWorkspacePage.tsx', code);
console.log('ConsultationWorkspacePage.tsx patched successfully part 1!');
