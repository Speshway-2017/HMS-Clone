import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BedDouble, User, Clock, FileText, Pill, AlertTriangle,
  ChevronRight, CheckCircle2, ClipboardList, HeartPulse, Thermometer, LogOut, Loader2, Heart, Scale, Plus
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { KpiCard } from "../../components/ui/KpiCard";
import { Modal } from "../../components/ui/Modal";
import { InputField, TextareaField, SelectField } from "../../components/ui/Field";
import { usePatients } from "../../features/patients";
import {
  validateTemperature,
  validateBloodPressure,
  validatePulseRate,
  validateRespiratoryRate,
  validateOxygenSaturation,
  validateWeight,
} from "../../utils/consultationValidation";
import { useInventory, useMedicineNames, useMedicineVariants } from "../../features/inventory";
import { useMyHospital } from "../../features/hospitals";
import {
  useDoctorInpatients,
  useInpatientDetails,
  useAddInpatientNotes,
  useAddInpatientMedication,
  useUpdateInpatientMedication,
  useSaveInpatientVitals,
  useCreateLabOrder,
  useCreateRadiologyOrder
} from "../../features/doctorDashboard";
import { api } from "../../lib/api";
import { socket } from "../../lib/socket";
import toast from "react-hot-toast";

const STATUS_BADGE: Record<string, { tone: "danger" | "warning" | "success" | "info" | "neutral"; label: string }> = {
  critical: { tone: "danger",  label: "Critical" },
  moderate: { tone: "warning", label: "Moderate" },
  stable:   { tone: "success", label: "Stable"   },
};

// Formatting INR currency helper
function formatINR(amount: number | string | undefined) {
  if (amount === undefined || amount === "") return "₹0";
  const numericVal = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numericVal)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numericVal);
}

const TABS = ["Admitted Patients", "Daily Notes", "Treatment Plan", "Lab Records", "Radiology", "Medical Timeline", "Discharge"];

function IPMedicineStrengthSelect({
  medicineName,
  value,
  onChange,
  error,
}: {
  medicineName: string;
  value: string;
  onChange: (val: string) => void;
  error?: string | null;
}) {
  const { data: variants } = useMedicineVariants(medicineName);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    setIsCustom(false);
  }, [medicineName]);

  const hasVariants = variants && variants.length > 0;

  if (isCustom || (!hasVariants && value)) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Strength
          </label>
          <span className="text-[10px] text-slate-400 font-mono font-sans">{value.length}/50</span>
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            value={value}
            maxLength={50}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. 500mg"
            className={`w-full rounded-xl border px-3 py-2 text-xs outline-none focus:ring-2 ${
              error ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200 bg-white focus:border-navy-600 focus:ring-navy-100"
            }`}
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
        {error && <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>}
      </div>
    );
  }

  if (!hasVariants) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Strength
          </label>
          <span className="text-[10px] text-slate-400 font-mono font-sans">{value.length}/50</span>
        </div>
        <input
          type="text"
          value={value}
          maxLength={50}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 500mg"
          className={`w-full rounded-xl border px-3 py-2 text-xs outline-none focus:ring-2 ${
            error ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200 bg-white focus:border-navy-600 focus:ring-navy-100"
          }`}
        />
        {error && <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Strength
        </label>
      </div>
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === "__other__") {
            setIsCustom(true);
            onChange("");
          } else {
            onChange(e.target.value);
          }
        }}
        className={`w-full rounded-xl border px-3 py-2 text-xs outline-none focus:ring-2 cursor-pointer ${
          error ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200 bg-white focus:border-navy-600 focus:ring-navy-100"
        }`}
      >
        <option value="">— Select Strength —</option>
        {variants.map((v) => (
          <option key={v._id} value={v.strength}>
            {v.strength || "N/A"} (Stock: {v.stockQty})
          </option>
        ))}
        <option value="__other__">✏️ Other (Custom)</option>
      </select>
      {error && <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>}
    </div>
  );
}

export function IPManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const { data: patientsData, isLoading } = usePatients({ status: "admitted" });
  const { data: admissionsList } = useDoctorInpatients();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [progressNote, setProgressNote] = useState("");
  const [progressDiagnosis, setProgressDiagnosis] = useState("");
  const [progressDiagError, setProgressDiagError] = useState<string | null>(null);
  const [progressNoteError, setProgressNoteError] = useState<string | null>(null);

  // Hooks for inpatient actions
  const { data: admissionDetails, isLoading: detailsLoading } = useInpatientDetails(selectedPatientId);
  const addNotesMutation = useAddInpatientNotes();
  const saveVitalsMutation = useSaveInpatientVitals();
  const addMedicationMutation = useAddInpatientMedication();
  const updateMedicationMutation = useUpdateInpatientMedication();

  // Real-time WebSockets synchronization for vitals and inpatient updates
  useEffect(() => {
    const handleVitalsUpdate = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "inpatients"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      if (selectedPatientId) {
        queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "inpatient", selectedPatientId] });
      }
      toast.success("Patient vitals updated live by Nurse!", { id: "live-vitals-toast" });
    };

    const handleIPUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "inpatients"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      if (selectedPatientId) {
        queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "inpatient", selectedPatientId] });
      }
    };

    socket.on("vitals_updated", handleVitalsUpdate);
    socket.on("ip_management_update", handleIPUpdate);
    socket.on("dashboard_update", handleIPUpdate);
    socket.on("notification:new", handleIPUpdate);

    return () => {
      socket.off("vitals_updated", handleVitalsUpdate);
      socket.off("ip_management_update", handleIPUpdate);
      socket.off("dashboard_update", handleIPUpdate);
      socket.off("notification:new", handleIPUpdate);
    };
  }, [queryClient, selectedPatientId]);

  // Modal control states
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isInlineFormOpen, setIsInlineFormOpen] = useState(false);
  const [medIdToEdit, setMedIdToEdit] = useState<string | null>(null);

  // Vitals form states
  const [temp, setTemp] = useState("");
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [resp, setResp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weight, setWeight] = useState("");

  const [tempError, setTempError] = useState<string | null>(null);
  const [bpError, setBpError] = useState<string | null>(null);
  const [pulseError, setPulseError] = useState<string | null>(null);
  const [respError, setRespError] = useState<string | null>(null);
  const [spo2Error, setSpo2Error] = useState<string | null>(null);
  const [weightError, setWeightError] = useState<string | null>(null);

  // Medication errors
  const [drugNameError, setDrugNameError] = useState<string | null>(null);
  const [strengthError, setStrengthError] = useState<string | null>(null);
  const [dosageError, setDosageError] = useState<string | null>(null);
  const [frequencyError, setFrequencyError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);

  // Radiology & Discharge errors
  const [radioNotesError, setRadioNotesError] = useState<string | null>(null);
  const [dischargeErrors, setDischargeErrors] = useState<Record<string, Record<string, string | null>>>({});

  // Medication form states (matching OP consultation rx fields)
  const { data: inventoryData } = useInventory({ category: "medicines" });
  const rawMeds = inventoryData?.data || [];
  const { data: medicineNames } = useMedicineNames();
  const uniqueMedNames = medicineNames || [];

  const [drugName, setDrugName] = useState("");
  const [strength, setStrength] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [route, setRoute] = useState("Oral");
  const [medNotes, setMedNotes] = useState("");
  const [morning, setMorning] = useState(false);
  const [afternoon, setAfternoon] = useState(false);
  const [night, setNight] = useState(false);

  // Lab & Radiology states & mutations
  const { data: hospitalData } = useMyHospital();
  const labTests = hospitalData?.availableLabTests && hospitalData.availableLabTests.length > 0
    ? hospitalData.availableLabTests
    : [
        "CBC (Complete Blood Count)",
        "Lipid Profile",
        "LFT (Liver Function Tests)",
        "RFT (Renal Function Tests)",
        "HbA1c (Glycated Haemoglobin)",
        "Thyroid Profile (TSH, T3, T4)",
      ];

  const radiologyTests = hospitalData?.availableRadiologyTests && hospitalData.availableRadiologyTests.length > 0
    ? hospitalData.availableRadiologyTests
    : ["X-ray", "CT Scan", "MRI", "Ultrasound"];

  const [selectedLabTests, setSelectedLabTests] = useState<string[]>([]);
  const [labPriority, setLabPriority] = useState("Routine");

  const [selectedRadiologyStudies, setSelectedRadiologyStudies] = useState<string[]>([]);
  const [radioPriority, setRadioPriority] = useState("Routine");
  const [radioNotes, setRadioNotes] = useState("");

  const labMutation = useCreateLabOrder();
  const radiologyMutation = useCreateRadiologyOrder();

  const toggleLabTest = (test: string) => {
    if (selectedLabTests.includes(test)) {
      setSelectedLabTests(selectedLabTests.filter((t) => t !== test));
    } else {
      setSelectedLabTests([...selectedLabTests, test]);
    }
  };

  const toggleRadiologyStudy = (study: string) => {
    setSelectedRadiologyStudies((prev) =>
      prev.includes(study) ? prev.filter((s) => s !== study) : [...prev, study]
    );
  };

  const handleOrderLabs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    if (selectedLabTests.length === 0) {
      toast.error("Please select at least one lab test");
      return;
    }
    try {
      await labMutation.mutateAsync({
        patientId: selectedPatientId,
        tests: selectedLabTests,
        priority: labPriority
      });
      setSelectedLabTests([]);
      toast.success("Laboratory tests ordered successfully!");
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "inpatient", selectedPatientId] });
    } catch {
      toast.error("Failed to order laboratory tests");
    }
  };

  const handleOrderRadiology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    if (selectedRadiologyStudies.length === 0) {
      toast.error("Please select at least one radiology study");
      return;
    }

    if (radioNotes && radioNotes.trim()) {
      if (radioNotes.trim().length > 500) {
        setRadioNotesError("Clinical Notes / Indications exceeds the maximum allowed length");
        toast.error("Clinical Notes / Indications exceeds the maximum allowed length");
        return;
      }
      if (!/[a-zA-Z0-9]/.test(radioNotes.trim()) || /<[^>]*>|javascript:/i.test(radioNotes.trim())) {
        setRadioNotesError("Please enter valid clinical notes / indications");
        toast.error("Please enter valid clinical notes / indications");
        return;
      }
    }
    setRadioNotesError(null);

    try {
      await radiologyMutation.mutateAsync({
        appointmentId: "none",
        patientId: selectedPatientId,
        type: selectedRadiologyStudies.join(", "),
        notes: radioNotes.trim(),
        priority: radioPriority
      });
      setSelectedRadiologyStudies([]);
      setRadioNotes("");
      toast.success("Radiology studies ordered successfully!");
      queryClient.invalidateQueries({ queryKey: ["doctorDashboard", "inpatient", selectedPatientId] });
    } catch {
      toast.error("Failed to order radiology studies");
    }
  };

  // Discharge form state
  const [dischargingId, setDischargingId] = useState<string | null>(null);
  const [dischargeForm, setDischargeForm] = useState<Record<string, {
    diagnosis: string;
    medications: string;
    followUp: string;
    specialInstructions: string;
  }>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [finalizedIds, setFinalizedIds] = useState<Set<string>>(new Set());

  const patients = patientsData?.data || [];

  // Set default selected patient once data loads
  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0]._id);
    }
  }, [patients, selectedPatientId]);

  // Sync details or prefill progress note
  useEffect(() => {
    if (admissionDetails) {
      if (admissionDetails.progressNotes?.length > 0) {
        const lastNote = admissionDetails.progressNotes[admissionDetails.progressNotes.length - 1];
        setProgressNote(lastNote.notes || "");
        setProgressDiagnosis(lastNote.assessment || "");
      } else {
        setProgressNote("Admitted. Patient stable. Watching vitals.");
        setProgressDiagnosis(admissionDetails.admissionReason || "Observation");
      }
    }
  }, [admissionDetails]);

  const selectedPatient = patients.find((p) => p._id === selectedPatientId) || patients[0];

  const handleSelect = (p: any) => {
    setSelectedPatientId(p._id);
  };

  const getDischargeField = (patientId: string, field: string) => {
    return (dischargeForm[patientId] as any)?.[field] || "";
  };

  const setDischargeField = (patientId: string, field: string, value: string) => {
    setDischargeForm(prev => ({
      ...prev,
      [patientId]: {
        diagnosis: prev[patientId]?.diagnosis || getPatientDiagnosis(patients.find(p => p._id === patientId)),
        medications: prev[patientId]?.medications || "Paracetamol 500mg TDS",
        followUp: prev[patientId]?.followUp || "OPD after 2 weeks",
        specialInstructions: prev[patientId]?.specialInstructions || "Rest, avoid heavy lifting, wound care daily.",
        [field]: value
      }
    }));
  };

  const initDischargeForm = (p: any) => {
    if (!dischargeForm[p._id]) {
      setDischargeForm(prev => ({
        ...prev,
        [p._id]: {
          diagnosis: getPatientDiagnosis(p),
          medications: "Paracetamol 500mg TDS",
          followUp: "OPD after 2 weeks",
          specialInstructions: "Rest, avoid heavy lifting, wound care daily.",
        }
      }));
    }
    setDischargingId(p._id);
  };

  const handleFinalizeDischarge = async (p: any) => {
    const form = dischargeForm[p._id];
    const diag = form?.diagnosis?.trim() || "";
    if (!diag) {
      toast.error("Please fill out this field");
      setDischargeErrors(prev => ({
        ...prev,
        [p._id]: { ...(prev[p._id] || {}), diagnosis: "Please fill out this field" }
      }));
      return;
    }
    if (diag.length > 200) {
      toast.error("Maximum allowed character limit exceeded");
      setDischargeErrors(prev => ({
        ...prev,
        [p._id]: { ...(prev[p._id] || {}), diagnosis: "Maximum allowed character limit exceeded" }
      }));
      return;
    }
    if (!/[a-zA-Z0-9]/.test(diag) || /<[^>]*>|javascript:/i.test(diag)) {
      toast.error("Please enter valid data");
      setDischargeErrors(prev => ({
        ...prev,
        [p._id]: { ...(prev[p._id] || {}), diagnosis: "Please enter valid data" }
      }));
      return;
    }

    const meds = form?.medications?.trim() || "";
    if (meds.length > 1000) {
      toast.error("Maximum allowed character limit exceeded");
      return;
    }
    const fu = form?.followUp?.trim() || "";
    if (fu.length > 500) {
      toast.error("Maximum allowed character limit exceeded");
      return;
    }
    const si = form?.specialInstructions?.trim() || "";
    if (si.length > 500) {
      toast.error("Maximum allowed character limit exceeded");
      return;
    }
    setSubmittingId(p._id);
    try {
      // Look up the admission record for this patient
      const admissionsRes = await api.get<any>("/doctors/dashboard/inpatients");
      const admissions = admissionsRes.data?.data || [];
      const admission = admissions.find((a: any) => {
        const pid = typeof a.patient === "object" ? a.patient._id : a.patient;
        return pid === p._id;
      });

      if (!admission) {
        toast.error("No active admission found for this patient");
        return;
      }

      await api.post(`/doctors/dashboard/admissions/${admission._id}/finalize-discharge`, {
        diagnosisAtDischarge: form.diagnosis,
        dischargeMedications: form.medications,
        followUp: form.followUp,
        specialInstructions: form.specialInstructions,
      });

      setFinalizedIds(prev => new Set([...prev, p._id]));
      setDischargingId(null);
      toast.success(`Discharge request sent for ${p.name}. Awaiting receptionist approval.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to finalize discharge. Please try again.");
    } finally {
      setSubmittingId(null);
    }
  };

  // Add progress note
  const handleSaveProgressNote = async () => {
    let hasError = false;

    // Validate Diagnosis/Round Subject
    const dTrimmed = progressDiagnosis.trim();
    if (!dTrimmed) {
      setProgressDiagError("Diagnosis/Round Subject is required");
      hasError = true;
    } else if (dTrimmed.length > 200) {
      setProgressDiagError("Diagnosis/Round Subject exceeds the maximum allowed length");
      hasError = true;
    } else if (!/[a-zA-Z0-9]/.test(dTrimmed) || /<[^>]*>|javascript:/i.test(dTrimmed)) {
      setProgressDiagError("Please enter valid data");
      hasError = true;
    } else {
      setProgressDiagError(null);
    }

    // Validate Daily Progress Notes
    const nTrimmed = progressNote.trim();
    if (!nTrimmed) {
      setProgressNoteError("Daily Progress Notes is required");
      hasError = true;
    } else if (nTrimmed.length > 2000) {
      setProgressNoteError("Daily Progress Notes exceeds the maximum allowed length");
      hasError = true;
    } else if (!/[a-zA-Z0-9]/.test(nTrimmed) || /<script\b|javascript:/i.test(nTrimmed)) {
      setProgressNoteError("Please enter valid data");
      hasError = true;
    } else {
      setProgressNoteError(null);
    }

    if (hasError || !selectedPatientId) return;

    try {
      await addNotesMutation.mutateAsync({
        patientId: selectedPatientId,
        notes: nTrimmed,
        diagnosis: dTrimmed
      });
      toast.success("Progress note saved successfully!");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save progress note.";
      toast.error(msg);
    }
  };

  // Open vitals modal
  const openVitalsModal = () => {
    const latest = admissionDetails?.vitals?.[admissionDetails.vitals.length - 1] || {};
    setTemp(latest.temperature || "");
    setBp(latest.bloodPressure || "");
    setPulse(latest.pulseRate || "");
    setResp(latest.respiratoryRate || "");
    setSpo2(latest.oxygenSaturation || "");
    setWeight(latest.weight || "");
    setTempError(null);
    setBpError(null);
    setPulseError(null);
    setRespError(null);
    setSpo2Error(null);
    setWeightError(null);
    setIsVitalsModalOpen(true);
  };

  // Vitals submit
  const handleVitalsSubmit = async () => {
    if (!selectedPatientId) return;

    let hasError = false;
    let firstErrorMsg: string | null = null;

    // Validate Temperature (optional)
    if (temp && temp.trim()) {
      if (temp.trim().length > 10) {
        setTempError("Maximum allowed character limit exceeded");
        hasError = true;
        firstErrorMsg = firstErrorMsg || "Maximum allowed character limit exceeded";
      } else {
        const err = validateTemperature(temp.trim());
        if (err) {
          setTempError(err);
          hasError = true;
          firstErrorMsg = firstErrorMsg || err;
        } else {
          setTempError(null);
        }
      }
    } else {
      setTempError(null);
    }

    // Validate Blood Pressure (optional)
    if (bp && bp.trim()) {
      if (bp.trim().length > 10) {
        setBpError("Maximum allowed character limit exceeded");
        hasError = true;
        firstErrorMsg = firstErrorMsg || "Maximum allowed character limit exceeded";
      } else {
        const err = validateBloodPressure(bp.trim());
        if (err) {
          setBpError(err);
          hasError = true;
          firstErrorMsg = firstErrorMsg || err;
        } else {
          setBpError(null);
        }
      }
    } else {
      setBpError(null);
    }

    // Validate Pulse Rate (optional)
    if (pulse && pulse.trim()) {
      if (pulse.trim().length > 5) {
        setPulseError("Maximum allowed character limit exceeded");
        hasError = true;
        firstErrorMsg = firstErrorMsg || "Maximum allowed character limit exceeded";
      } else {
        const err = validatePulseRate(pulse.trim());
        if (err) {
          setPulseError(err);
          hasError = true;
          firstErrorMsg = firstErrorMsg || err;
        } else {
          setPulseError(null);
        }
      }
    } else {
      setPulseError(null);
    }

    // Validate Respiratory Rate (optional)
    if (resp && resp.trim()) {
      if (resp.trim().length > 5) {
        setRespError("Maximum allowed character limit exceeded");
        hasError = true;
        firstErrorMsg = firstErrorMsg || "Maximum allowed character limit exceeded";
      } else {
        const err = validateRespiratoryRate(resp.trim());
        if (err) {
          setRespError(err);
          hasError = true;
          firstErrorMsg = firstErrorMsg || err;
        } else {
          setRespError(null);
        }
      }
    } else {
      setRespError(null);
    }

    // Validate Oxygen Saturation (optional)
    if (spo2 && spo2.trim()) {
      if (spo2.trim().length > 5) {
        setSpo2Error("Maximum allowed character limit exceeded");
        hasError = true;
        firstErrorMsg = firstErrorMsg || "Maximum allowed character limit exceeded";
      } else {
        const err = validateOxygenSaturation(spo2.trim());
        if (err) {
          setSpo2Error(err);
          hasError = true;
          firstErrorMsg = firstErrorMsg || err;
        } else {
          setSpo2Error(null);
        }
      }
    } else {
      setSpo2Error(null);
    }

    // Validate Weight (optional)
    if (weight && weight.trim()) {
      if (weight.trim().length > 6) {
        setWeightError("Maximum allowed character limit exceeded");
        hasError = true;
        firstErrorMsg = firstErrorMsg || "Maximum allowed character limit exceeded";
      } else {
        const err = validateWeight(weight.trim());
        if (err) {
          setWeightError(err);
          hasError = true;
          firstErrorMsg = firstErrorMsg || err;
        } else {
          setWeightError(null);
        }
      }
    } else {
      setWeightError(null);
    }

    if (hasError) {
      if (firstErrorMsg) toast.error(firstErrorMsg);
      return;
    }

    try {
      await saveVitalsMutation.mutateAsync({
        patientId: selectedPatientId,
        temperature: temp.trim(),
        bloodPressure: bp.trim(),
        pulseRate: pulse.trim(),
        respiratoryRate: resp.trim(),
        oxygenSaturation: spo2.trim(),
        weight: weight.trim()
      });
      toast.success("Vitals updated successfully!");
      setIsVitalsModalOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save vitals.";
      toast.error(msg);
    }
  };

  const clearMedErrors = () => {
    setDrugNameError(null);
    setStrengthError(null);
    setDosageError(null);
    setFrequencyError(null);
    setDurationError(null);
  };

  const validateDrugNameField = (val: string) => {
    const trimmed = (val || "").trim();
    if (!trimmed) return "Please fill out this field";
    if (trimmed.length > 150) return "Maximum allowed character limit exceeded";
    if (!/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
      return "Please enter valid data";
    }
    return null;
  };

  const validateStrengthField = (val: string) => {
    const trimmed = (val || "").trim();
    if (!trimmed) return null;
    if (trimmed.length > 50) return "Maximum allowed character limit exceeded";
    if (!/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
      return "Please enter valid data";
    }
    return null;
  };

  const validateDosageField = (val: string) => {
    const trimmed = (val || "").trim();
    if (!trimmed) return null;
    if (trimmed.length > 50) return "Maximum allowed character limit exceeded";
    if (!/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
      return "Please enter valid data";
    }
    return null;
  };

  const validateFrequencyField = (val: string) => {
    const trimmed = (val || "").trim();
    if (!trimmed) return null;
    if (trimmed.length > 50) return "Maximum allowed character limit exceeded";
    if (!/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
      return "Please enter valid data";
    }
    return null;
  };

  const validateDurationField = (val: string) => {
    const trimmed = (val || "").trim();
    if (!trimmed) return null;
    if (trimmed.length > 50) return "Maximum allowed character limit exceeded";
    const isPureLetters = /^[a-zA-Z\s]+$/.test(trimmed) && !/\b(day|days|week|weeks|month|months)\b/i.test(trimmed);
    const isZeroOrNegative = /^-\d+|^\s*0+(\s*(day|days))?\s*$/i.test(trimmed);
    if (!/[a-zA-Z0-9]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed) || isPureLetters || isZeroOrNegative) {
      return "Please enter valid data";
    }
    return null;
  };

  // Open medication modal
  const openAddMedModal = () => {
    setMedIdToEdit(null);
    setDrugName("");
    setStrength("");
    setDosage("");
    setFrequency("");
    setDuration("");
    setRoute("Oral");
    setMedNotes("");
    setMorning(false);
    setAfternoon(false);
    setNight(false);
    clearMedErrors();
    setIsInlineFormOpen(true);
  };

  const openModifyMedModal = (med: any) => {
    setMedIdToEdit(med._id);

    // Parse name and strength
    let dName = med.drugName || "";
    let str = "";
    const match = dName.match(/^(.*?)\s*(\d+(?:mg|g|mcg|ml|l|capsule|tablet|tabs|caps))$/i);
    if (match) {
      dName = match[1];
      str = match[2];
    }
    setDrugName(dName);
    setStrength(str);

    setDosage(med.dosage || "");
    setFrequency(med.frequency || "");
    setDuration(med.duration || "");
    setRoute(med.route || "Oral");

    // Parse checkboxes from notes
    let isMorning = false;
    let isAfternoon = false;
    let isNight = false;
    let cleanNotes = med.notes || "";

    if (cleanNotes.startsWith("Instructions: ")) {
      const parts = cleanNotes.split(". Notes: ");
      const instPart = parts[0].replace("Instructions: ", "");
      isMorning = instPart.includes("Morning");
      isAfternoon = instPart.includes("Afternoon");
      isNight = instPart.includes("Night");
      cleanNotes = parts[1] || "";
    }
    setMorning(isMorning);
    setAfternoon(isAfternoon);
    setNight(isNight);
    setMedNotes(cleanNotes);
    clearMedErrors();

    setIsInlineFormOpen(true);
  };

  // Medication submit
  const handleMedSubmit = async () => {
    if (!selectedPatientId) return;

    const dNameErr = validateDrugNameField(drugName);
    const sErr = validateStrengthField(strength);
    const dosErr = validateDosageField(dosage);
    const fErr = validateFrequencyField(frequency);
    const durErr = validateDurationField(duration);

    setDrugNameError(dNameErr);
    setStrengthError(sErr);
    setDosageError(dosErr);
    setFrequencyError(fErr);
    setDurationError(durErr);

    const firstErr = dNameErr || sErr || dosErr || fErr || durErr;
    if (firstErr) {
      toast.error(firstErr);
      return;
    }

    // Combine drugName and strength
    const combinedDrugName = strength.trim() ? `${drugName.trim()} ${strength.trim()}` : drugName.trim();

    // Combine instructions
    const selectedTimes = [];
    if (morning) selectedTimes.push("Morning");
    if (afternoon) selectedTimes.push("Afternoon");
    if (night) selectedTimes.push("Night");
    const instructions = selectedTimes.join(", ");

    const notesToSave = instructions
      ? `Instructions: ${instructions}${medNotes.trim() ? `. Notes: ${medNotes.trim()}` : ""}`
      : medNotes.trim();

    try {
      if (medIdToEdit) {
        await updateMedicationMutation.mutateAsync({
          patientId: selectedPatientId,
          medicationId: medIdToEdit,
          action: "modify",
          drugName: combinedDrugName,
          dosage: dosage.trim(),
          frequency: frequency.trim(),
          duration: duration.trim(),
          route,
          notes: notesToSave
        });
        toast.success("Medication order modified!");
      } else {
        await addMedicationMutation.mutateAsync({
          patientId: selectedPatientId,
          drugName: combinedDrugName,
          dosage: dosage.trim(),
          frequency: frequency.trim(),
          duration: duration.trim(),
          route,
          notes: notesToSave
        });
        toast.success("New medication ordered!");
      }
      setIsInlineFormOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save medication order.";
      toast.error(msg);
    }
  };

  // Stop/resume medication
  const handleMedStatusChange = async (medId: string, action: "stop" | "resume") => {
    if (!selectedPatientId) return;
    try {
      await updateMedicationMutation.mutateAsync({
        patientId: selectedPatientId,
        medicationId: medId,
        action
      });
      toast.success(`Medication order ${action === "stop" ? "stopped" : "resumed"}!`);
    } catch (err) {
      toast.error("Failed to update medication status.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  const getAttendingDoctor = (p: any, admDetail?: any) => {
    if (admDetail?.admittingDoctor?.name) {
      return admDetail.admittingDoctor.name.startsWith("Dr.") ? admDetail.admittingDoctor.name : `Dr. ${admDetail.admittingDoctor.name}`;
    }
    if (typeof p?.assignedDoctor === "object" && p.assignedDoctor?.name) {
      return p.assignedDoctor.name.startsWith("Dr.") ? p.assignedDoctor.name : `Dr. ${p.assignedDoctor.name}`;
    }
    const admMatch = admissionsList?.find((a: any) => (a.patient?._id || a.patient) === p._id);
    if (admMatch?.admittingDoctor?.name) {
      return admMatch.admittingDoctor.name.startsWith("Dr.") ? admMatch.admittingDoctor.name : `Dr. ${admMatch.admittingDoctor.name}`;
    }
    return "Dr. On Duty";
  };

  const getBedDisplay = (p: any, admDetail?: any) => {
    const adm = admDetail || admissionsList?.find((a: any) => (a.patient?._id || a.patient) === p._id);
    const bedNum = adm?.bed?.bedNumber || adm?.bed?.bedCode || adm?.bedNumber;
    const wardName = adm?.ward?.name || (typeof adm?.ward === "string" ? adm.ward : null) || adm?.room?.roomNumber || adm?.room?.name;

    if (bedNum && wardName) return `${wardName} · Bed ${bedNum}`;
    if (bedNum) return `Bed ${bedNum}`;
    if (wardName) return `Ward: ${wardName}`;
    return "Bed Unassigned";
  };

  const getDaysAdmitted = (p: any) => {
    const adm = admissionsList?.find((a: any) => (a.patient?._id || a.patient) === p._id);
    const dateStr = adm?.admissionDate || p.createdAt;
    const created = new Date(dateStr);
    const diff = Math.floor((new Date().getTime() - created.getTime()) / (1000 * 3600 * 24));
    return Math.max(1, diff);
  };

  const getPatientDiagnosis = (p: any) => {
    const adm = admissionsList?.find((a: any) => (a.patient?._id || a.patient) === p._id);
    return adm?.primaryDiagnosis || adm?.admissionReason || p?.medicalHistory?.[0]?.diagnosis || "Observation / Check-up";
  };

  const renderTimelineIcon = (type: string) => {
    switch (type) {
      case "progress_note":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "vital_update":
        return <HeartPulse className="h-4 w-4 text-emerald-500" />;
      case "medication_ordered":
        return <Pill className="h-4 w-4 text-indigo-500" />;
      case "medication_stopped":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "medication_modified":
        return <Pill className="h-4 w-4 text-purple-500" />;
      case "lab_request":
        return <ClipboardList className="h-4 w-4 text-sky-500" />;
      case "radiology_request":
        return <ClipboardList className="h-4 w-4 text-violet-500" />;
      case "admission":
        return <BedDouble className="h-4 w-4 text-teal-500" />;
      case "discharge":
        return <LogOut className="h-4 w-4 text-rose-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-400">Doctor Portal &gt; IP Management</p>
        <h1 className="text-2xl font-bold text-slate-900">In-Patient (IP) Rounds</h1>
        <p className="text-sm text-slate-500">Monitor admitted patients, update ward notes, and design daily treatment charts.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Admitted Patients" value={patients.length} icon={<BedDouble className="h-5 w-5" />} />
        <KpiCard label="Critical Cases" value={patients.filter((p) => p.allergies?.toLowerCase().includes("penicillin")).length} icon={<AlertTriangle className="h-5 w-5" />} />
        <KpiCard label="Stable for Discharge" value={patients.filter((p) => p.age && p.age < 50).length} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto max-w-full scrollbar-none flex-nowrap shrink-0">
        {TABS.map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActiveTab(idx)}
            className={`border-b-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === idx
                ? "border-navy-700 text-navy-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {patients.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <BedDouble className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Admitted Patients</h3>
          <p className="text-xs text-slate-400">There are no patients currently registered as admitted in the hospital.</p>
        </Card>
      ) : (
        <>
          {/* Admitted Patients Tab */}
          {activeTab === 0 && selectedPatient && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left List */}
              <Card className="h-[550px] overflow-y-auto p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">IP Patient Directory</p>
                {patients.map((p) => {
                  const isActive = p._id === selectedPatient._id;
                  const isCritical = p.allergies?.toLowerCase().includes("penicillin");
                  const pStatus = isCritical ? "critical" : p.age && p.age > 60 ? "moderate" : "stable";

                  return (
                    <div
                      key={p._id}
                      onClick={() => handleSelect(p)}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50 ${
                        isActive ? "border-navy-500 bg-navy-50/20" : "border-slate-100"
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                        {p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                          <Badge tone={STATUS_BADGE[pStatus].tone}>{STATUS_BADGE[pStatus].label}</Badge>
                        </div>
                        <p className="text-xs text-slate-400">{getBedDisplay(p)} · Day {getDaysAdmitted(p)}</p>
                        <p className="text-xs text-slate-500 truncate mt-1">{getPatientDiagnosis(p)}</p>
                      </div>
                    </div>
                  );
                })}
              </Card>

              {/* Right Profile Details */}
              <div className="lg:col-span-2 space-y-4">
                {/* Header */}
                <Card className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-700 text-lg font-bold text-white">
                    {selectedPatient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-slate-800">{selectedPatient.name}</h2>
                      <Badge tone={selectedPatient.allergies?.toLowerCase().includes("penicillin") ? "danger" : "success"}>
                        Attending: {getAttendingDoctor(selectedPatient, admissionDetails)}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedPatient.age || "—"} yrs · {selectedPatient.gender || "—"} · Blood Group: {selectedPatient.bloodGroup || admissionDetails?.patient?.bloodGroup || "—"} · Phone: {selectedPatient.phone || admissionDetails?.patient?.phone || "—"}
                    </p>
                    <p className="text-xs font-medium text-navy-700 mt-0.5 font-mono">
                      {getBedDisplay(selectedPatient, admissionDetails)} {selectedPatient.uhid ? `· UHID: ${selectedPatient.uhid}` : ""}
                    </p>
                  </div>
                </Card>

                {/* Vitals Summary */}
                {detailsLoading ? (
                  <div className="py-4 text-center text-xs text-slate-400">Loading vitals...</div>
                ) : (
                  <div className="relative">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[
                        { label: "Blood Pressure", value: admissionDetails?.vitals?.[admissionDetails.vitals.length - 1]?.bloodPressure || "—", icon: <HeartPulse className="h-4 w-4 text-rose-500" /> },
                        { label: "Pulse / HR", value: admissionDetails?.vitals?.[admissionDetails.vitals.length - 1]?.pulseRate ? `${admissionDetails.vitals[admissionDetails.vitals.length - 1].pulseRate} bpm` : "—", icon: <HeartPulse className="h-4 w-4 text-emerald-500" /> },
                        { label: "Temperature", value: admissionDetails?.vitals?.[admissionDetails.vitals.length - 1]?.temperature ? `${admissionDetails.vitals[admissionDetails.vitals.length - 1].temperature}°F` : "—", icon: <Thermometer className="h-4 w-4 text-amber-500" /> },
                        { label: "SpO₂ Status", value: admissionDetails?.vitals?.[admissionDetails.vitals.length - 1]?.oxygenSaturation ? `${admissionDetails.vitals[admissionDetails.vitals.length - 1].oxygenSaturation}%` : "—", icon: <Thermometer className="h-4 w-4 text-blue-500" /> },
                      ].map((vital) => (
                        <Card key={vital.label} className="p-3">
                          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                            {vital.icon} {vital.label}
                          </div>
                          <p className="text-sm font-semibold text-slate-800">{vital.value}</p>
                        </Card>
                      ))}
                    </div>
                    <button
                      onClick={openVitalsModal}
                      className="absolute -top-3 right-0 bg-navy-50 text-navy-700 border border-navy-200 rounded px-2 py-0.5 text-[10px] font-bold hover:bg-navy-100 transition-colors"
                    >
                      Record Vitals
                    </button>
                  </div>
                )}

                {/* Progress Note */}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-navy-700" /> Daily Progress Note
                    </h3>
                    <span className="text-xs text-slate-400">Day {getDaysAdmitted(selectedPatient)} Note</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Diagnosis/Round Subject <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">{progressDiagnosis.length}/200</span>
                      </div>
                      <input
                        type="text"
                        value={progressDiagnosis}
                        onChange={(e) => {
                          setProgressDiagnosis(e.target.value);
                          if (progressDiagError) setProgressDiagError(null);
                        }}
                        placeholder="e.g. Daily General Round / Monitoring"
                        maxLength={250}
                        className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-none ${
                          progressDiagError
                            ? "border-rose-400 bg-rose-50/20 focus:border-rose-500"
                            : "border-slate-200 bg-white focus:border-navy-500"
                        }`}
                      />
                      {progressDiagError && (
                        <p className="mt-1 text-xs font-medium text-rose-500">{progressDiagError}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Daily Progress Notes <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">{progressNote.length}/2000</span>
                      </div>
                      <textarea
                        value={progressNote}
                        onChange={(e) => {
                          setProgressNote(e.target.value);
                          if (progressNoteError) setProgressNoteError(null);
                        }}
                        rows={4}
                        placeholder="Enter patient vitals, stability, or medication updates..."
                        maxLength={2500}
                        className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-none resize-none ${
                          progressNoteError
                            ? "border-rose-400 bg-rose-50/20 focus:border-rose-500"
                            : "border-slate-200 bg-white focus:border-navy-500"
                        }`}
                      />
                      {progressNoteError && (
                        <p className="mt-1 text-xs font-medium text-rose-500">{progressNoteError}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="primary"
                      onClick={handleSaveProgressNote}
                      disabled={addNotesMutation.isPending}
                    >
                      {addNotesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Save Note
                    </Button>
                  </div>
                </Card>

                {/* Medications */}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Pill className="h-4 w-4 text-navy-700" /> Medication Orders
                    </h3>
                    <button
                      onClick={openAddMedModal}
                      className="text-xs font-semibold text-navy-700 hover:underline"
                    >
                      + Add Drug
                    </button>
                  </div>
                  {isInlineFormOpen && (
                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 mb-3.5 space-y-3">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {medIdToEdit ? "Modify Medication" : "Issue Medication"}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="col-span-2 relative">
                          <InputField
                            label="Medicine Name *"
                            value={drugName}
                            charCount={drugName.length}
                            maxLength={150}
                            error={drugNameError}
                            onChange={(e) => {
                              setDrugName(e.target.value);
                              if (drugNameError) setDrugNameError(null);
                            }}
                            onBlur={() => setDrugNameError(validateDrugNameField(drugName))}
                            placeholder="e.g. Amoxicillin"
                            list="ip-med-datalist-inline"
                          />
                          <datalist id="ip-med-datalist-inline">
                            {drugName.trim().length > 0 &&
                              uniqueMedNames
                                .filter((n: string) =>
                                  n.toLowerCase().includes(drugName.toLowerCase())
                                )
                                .map((n: string) => (
                                  <option key={n} value={n} />
                                ))}
                          </datalist>
                        </div>
                        <div>
                          <IPMedicineStrengthSelect
                            medicineName={drugName}
                            value={strength}
                            error={strengthError}
                            onChange={(val) => {
                              setStrength(val);
                              if (strengthError) setStrengthError(null);
                            }}
                          />
                        </div>
                        <div>
                          <InputField
                            label="Dosage"
                            value={dosage}
                            charCount={dosage.length}
                            maxLength={50}
                            error={dosageError}
                            onChange={(e) => {
                              setDosage(e.target.value);
                              if (dosageError) setDosageError(null);
                            }}
                            onBlur={() => setDosageError(validateDosageField(dosage))}
                            placeholder="e.g. 1"
                          />
                        </div>
                        <div>
                          <InputField
                            label="Frequency"
                            value={frequency}
                            charCount={frequency.length}
                            maxLength={50}
                            error={frequencyError}
                            onChange={(e) => {
                              setFrequency(e.target.value);
                              if (frequencyError) setFrequencyError(null);
                            }}
                            onBlur={() => setFrequencyError(validateFrequencyField(frequency))}
                            placeholder="e.g. 3"
                          />
                        </div>
                        <div>
                          <InputField
                            label="Duration"
                            value={duration}
                            charCount={duration.length}
                            maxLength={50}
                            error={durationError}
                            onChange={(e) => {
                              setDuration(e.target.value);
                              if (durationError) setDurationError(null);
                            }}
                            onBlur={() => setDurationError(validateDurationField(duration))}
                            placeholder="e.g. 5"
                          />
                        </div>
                        <div>
                          <InputField
                            label="Total Qty"
                            value={((parseFloat(dosage) || 0) * (parseFloat(frequency) || 0) * (parseFloat(duration) || 0)) || ""}
                            disabled
                            placeholder="Auto"
                          />
                        </div>
                        <div>
                          <SelectField
                            label="Route"
                            value={route}
                            onChange={(e) => setRoute(e.target.value)}
                          >
                            <option value="Oral">Oral</option>
                            <option value="IV">IV</option>
                            <option value="IM">IM</option>
                            <option value="SC">SC</option>
                            <option value="Inhalation">Inhalation</option>
                            <option value="Topical">Topical</option>
                          </SelectField>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                          Instructions (Time of Use)
                        </label>
                        <div className="flex items-center gap-3 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white">
                          <label className="flex items-center gap-1 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={morning}
                              onChange={() => setMorning(!morning)}
                              className="rounded text-navy-600 focus:ring-navy-500 h-3.5 w-3.5"
                            />
                            <span>Morning</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={afternoon}
                              onChange={() => setAfternoon(!afternoon)}
                              className="rounded text-navy-600 focus:ring-navy-500 h-3.5 w-3.5"
                            />
                            <span>Afternoon</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={night}
                              onChange={() => setNight(!night)}
                              className="rounded text-navy-600 focus:ring-navy-500 h-3.5 w-3.5"
                            />
                            <span>Night</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <TextareaField
                          label="Special Instructions / Notes"
                          value={medNotes}
                          charCount={medNotes.length}
                          maxLength={500}
                          onChange={(e) => setMedNotes(e.target.value)}
                          placeholder="e.g. Take after meals"
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          variant="secondary"
                          onClick={() => setIsInlineFormOpen(false)}
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          onClick={handleMedSubmit}
                          disabled={addMedicationMutation.isPending || updateMedicationMutation.isPending}
                          size="sm"
                        >
                          {addMedicationMutation.isPending || updateMedicationMutation.isPending ? "Saving..." : "Save Medication"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {detailsLoading ? (
                    <div className="py-4 text-center text-xs text-slate-400">Loading medications...</div>
                  ) : (
                    <>
                      {admissionDetails?.medicationOrders?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No active medication orders.</p>
                      ) : (
                        admissionDetails?.medicationOrders?.map((med: any) => (
                          <div
                            key={med._id}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 mb-1.5 hover:bg-slate-50 transition-colors ${
                              med.status === "stopped" ? "border-slate-200 bg-slate-100/50 text-slate-400 line-through" : "border-slate-100"
                            }`}
                          >
                            <div className="text-xs">
                              <span className="font-semibold text-slate-705 block">{med.drugName}</span>
                              <span className="text-slate-400">{med.dosage} · {med.frequency} · {med.duration} ({med.route})</span>
                            </div>
                            <div className="flex gap-2">
                              {med.status !== "stopped" ? (
                                <>
                                  <button
                                    onClick={() => openModifyMedModal(med)}
                                    className="text-xs text-amber-600 hover:underline font-bold"
                                  >
                                    Modify
                                  </button>
                                  <button
                                    onClick={() => handleMedStatusChange(med._id, "stop")}
                                    className="text-xs text-red-500 hover:underline font-bold"
                                  >
                                    Stop
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleMedStatusChange(med._id, "resume")}
                                  className="text-xs text-emerald-600 hover:underline font-bold"
                                >
                                  Resume
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}
                  {selectedPatient.allergies && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                      <p className="text-xs text-red-700 font-medium">Allergies: {selectedPatient.allergies}</p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* Daily Notes Tab */}
          {activeTab === 1 && (
            <Card>
              <h3 className="mb-4 text-base font-semibold text-slate-800">Daily Progress Notes — All IP Patients</h3>
              <div className="space-y-4">
                {admissionsList && admissionsList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">No active inpatients admitted under your care.</p>
                ) : (
                  admissionsList?.map((adm: any) => {
                    const p = adm.patient;
                    if (!p) return null;
                    const latestNote = adm.progressNotes?.[adm.progressNotes.length - 1];
                    const isCritical = p.allergies?.toLowerCase().includes("penicillin");
                    const pStatus = isCritical ? "critical" : p.age && p.age > 60 ? "moderate" : "stable";

                    return (
                      <div key={adm._id} className="rounded-xl border border-slate-100 p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                            {p.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{p.name} <span className="text-slate-400 font-normal">· {getBedDisplay(p, adm)} · Day {getDaysAdmitted(adm)}</span></p>
                            <p className="text-xs text-slate-500">{getPatientDiagnosis(p)}</p>
                          </div>
                          <span className="ml-auto">
                            <Badge tone={STATUS_BADGE[pStatus].tone} >{STATUS_BADGE[pStatus].label}</Badge>
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold mb-1">Latest Assessment: {latestNote?.assessment || "General Monitoring"}</p>
                        <p className="text-sm text-slate-650 rounded-lg bg-slate-50 px-3 py-2">{latestNote?.notes || "Admitted. Vital monitoring stable."}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          )}

          {/* Treatment Plan Tab */}
          {activeTab === 2 && (
            <div className="space-y-4">
              {admissionsList && admissionsList.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">No active treatment plans.</p>
              ) : (
                admissionsList?.map((adm: any) => {
                  const p = adm.patient;
                  if (!p) return null;
                  const isCritical = p.allergies?.toLowerCase().includes("penicillin");
                  const pStatus = isCritical ? "critical" : p.age && p.age > 60 ? "moderate" : "stable";
                  const activeMeds = adm.medicationOrders?.filter((m: any) => m.status === "active" || m.status === "modified") || [];

                  return (
                    <Card key={adm._id}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">{p.name} — Treatment Plan</h3>
                          <p className="text-xs text-slate-500">{getPatientDiagnosis(p)} · Attending: {getAttendingDoctor(p, adm)}</p>
                        </div>
                        <Badge tone={STATUS_BADGE[pStatus].tone}>{STATUS_BADGE[pStatus].label}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Medications</p>
                          {activeMeds.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No active medications.</p>
                          ) : (
                            activeMeds.map((med: any, i: number) => (
                              <p key={i} className="text-xs text-slate-700 font-medium">• {med.drugName} ({med.dosage}) · {med.frequency}</p>
                            ))
                          )}
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Vitals Goal</p>
                          <p className="text-xs text-slate-650">• Temp: Stable (98.6°F)</p>
                          <p className="text-xs text-slate-655">• BP &lt; 130/80 mmHg</p>
                          <p className="text-xs text-slate-655">• SpO₂ &gt; 95%</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Plan Details</p>
                          <p className="text-xs text-slate-655">• Ward Daily Rounds Note</p>
                          <p className="text-xs text-slate-655">• Discharge review in {Math.max(1, 7 - getDaysAdmitted(adm))} days</p>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Lab Records Tab */}
          {activeTab === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <form onSubmit={handleOrderLabs} className="md:col-span-1">
                <Card className="p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Order Laboratory Tests</h3>
                  <div className="space-y-2">
                    {labTests.map((test: string) => (
                      <label key={test} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLabTests.includes(test)}
                          onChange={() => toggleLabTest(test)}
                          className="rounded border-slate-350 text-navy-700 focus:ring-navy-500 h-4 w-4"
                        />
                        {test}
                      </label>
                    ))}
                  </div>

                  <SelectField label="Priority" value={labPriority} onChange={(e) => setLabPriority(e.target.value)}>
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="STAT">STAT / Emergency</option>
                  </SelectField>

                  <Button type="submit" variant="primary" disabled={labMutation.isPending}>
                    {labMutation.isPending ? "Submitting..." : "Submit Labs Order"}
                  </Button>
                </Card>
              </form>

              <div className="md:col-span-2">
                <Card className="p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Today's Lab Orders</h3>
                  {detailsLoading ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Loading lab orders...</p>
                  ) : !admissionDetails?.labOrders || admissionDetails.labOrders.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No lab requests submitted for this patient session.</p>
                  ) : (
                    <div className="space-y-3">
                      {admissionDetails.labOrders.map((o: any) => (
                        <div key={o._id} className="border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {o.tests?.map((t: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                                  {t}
                                </span>
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-1">Order Date: {new Date(o.createdAt || o.date).toLocaleDateString("en-IN")}</span>
                          </div>
                          <Badge tone={o.status === "completed" ? "success" : o.status === "rejected" ? "danger" : o.status === "pending" ? "warning" : "neutral"}>
                            {o.status.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* Radiology Tab */}
          {activeTab === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <form onSubmit={handleOrderRadiology} className="md:col-span-1">
                <Card className="p-4 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-bold text-slate-800">Order Imaging Studies</h3>
                    {selectedRadiologyStudies.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full px-2 py-0.5">
                          {selectedRadiologyStudies.length} selected
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedRadiologyStudies([])}
                          className="text-[10px] text-red-500 hover:underline"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {radiologyTests.map((study: string) => (
                      <label key={study} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedRadiologyStudies.includes(study)}
                          onChange={() => toggleRadiologyStudy(study)}
                          className="rounded border-slate-350 text-navy-700 focus:ring-navy-500 h-4 w-4"
                        />
                        {study}
                      </label>
                    ))}
                  </div>

                  <SelectField label="Priority" value={radioPriority} onChange={(e) => setRadioPriority(e.target.value)}>
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="STAT">STAT / Emergency</option>
                  </SelectField>

                  <TextareaField
                    label="Clinical Notes / Indications"
                    value={radioNotes}
                    charCount={radioNotes.length}
                    maxLength={500}
                    error={radioNotesError}
                    onChange={(e) => {
                      setRadioNotes(e.target.value);
                      if (radioNotesError) setRadioNotesError(null);
                    }}
                    placeholder="e.g. Suspected fracture right forearm"
                    rows={2}
                  />

                  <Button type="submit" variant="primary" disabled={radiologyMutation.isPending || selectedRadiologyStudies.length === 0}>
                    {radiologyMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </Card>
              </form>

              <div className="md:col-span-2">
                <Card className="p-4 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Requested Imaging Studies</h3>
                  {detailsLoading ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Loading imaging studies...</p>
                  ) : !admissionDetails?.radiologyOrders || admissionDetails.radiologyOrders.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No radiology orders requested during this session.</p>
                  ) : (
                    <div className="space-y-3">
                      {admissionDetails.radiologyOrders.map((o: any) => (
                        <div key={o._id} className="border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 text-sm">{o.type}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Indications: {o.notes || "—"}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Order Date: {new Date(o.createdAt || o.date).toLocaleDateString("en-IN")}</span>
                          </div>
                          <Badge tone={o.status === "completed" ? "success" : o.status === "cancelled" ? "danger" : o.status === "pending" ? "warning" : "neutral"}>
                            {o.status.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* Medical Timeline Tab */}
          {activeTab === 5 && (
            <Card>
              <h3 className="mb-4 text-base font-semibold text-slate-800">Unified Medical Timeline — {selectedPatient.name}</h3>
              {detailsLoading ? (
                <div className="py-8 text-center text-slate-400">Loading timeline...</div>
              ) : (
                <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
                  {admissionDetails?.timeline?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No events logged in the admission timeline.</p>
                  ) : (
                    admissionDetails?.timeline?.map((evt: any, i: number) => (
                      <div key={i} className="relative">
                        <span className="absolute -left-9 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm">
                          {renderTimelineIcon(evt.eventType)}
                        </span>
                        <div className="text-xs text-slate-400 mb-1">
                          {new Date(evt.date).toLocaleDateString()} at {evt.time} · {evt.userName} ({evt.userRole})
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{evt.description}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Discharge Tab */}
          {activeTab === 6 && (
            <div className="space-y-4">
              {patients.map((p) => {
                const isFinalized = finalizedIds.has(p._id);
                const isExpanded = dischargingId === p._id;
                const isSubmitting = submittingId === p._id;

                return (
                  <Card key={p._id} className={isFinalized ? "border-emerald-200 bg-emerald-50/30" : ""}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">Discharge Summary — {p.name}</h3>
                        <p className="text-xs text-slate-500">Admitted {getDaysAdmitted(p)} days ago · {getBedDisplay(p)}</p>
                      </div>
                      {isFinalized ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Discharge Request Sent
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={() => isExpanded ? setDischargingId(null) : initDischargeForm(p)}
                        >
                          <LogOut className="h-4 w-4" /> {isExpanded ? "Cancel" : "Finalize Discharge"}
                        </Button>
                      )}
                    </div>

                    {isFinalized ? (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                        <p className="text-xs font-semibold text-emerald-700 mb-0.5">Awaiting receptionist confirmation</p>
                        <p className="text-xs text-emerald-600">The discharge request has been sent to the front desk. The receptionist will process and confirm the discharge shortly.</p>
                      </div>
                    ) : (
                      <>
                        {/* Always-visible summary preview */}
                        {!isExpanded && (
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-xs font-semibold text-slate-400 mb-1">Diagnosis at Discharge</p>
                              <p className="text-sm text-slate-700">{getPatientDiagnosis(p)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-400 mb-1">Discharge Medications</p>
                              <p className="text-xs text-slate-600">• Paracetamol 500mg TDS</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-400 mb-1">Follow-up</p>
                              <p className="text-sm text-slate-700">OPD after 2 weeks</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-400 mb-1">Special Instructions</p>
                              <p className="text-sm text-slate-700">Rest, avoid heavy lifting, wound care daily.</p>
                            </div>
                          </div>
                        )}

                        {/* Expanded discharge form */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 pt-4 space-y-4">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Fill Discharge Summary</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-xs font-semibold text-slate-500">Diagnosis at Discharge <span className="text-red-500">*</span></label>
                                  <span className="text-[10px] text-slate-400 font-mono font-sans">{getDischargeField(p._id, "diagnosis").length}/200</span>
                                </div>
                                <input
                                  type="text"
                                  value={getDischargeField(p._id, "diagnosis")}
                                  maxLength={200}
                                  onChange={e => {
                                    setDischargeField(p._id, "diagnosis", e.target.value);
                                    if (dischargeErrors[p._id]?.diagnosis) {
                                      setDischargeErrors(prev => ({
                                        ...prev,
                                        [p._id]: { ...(prev[p._id] || {}), diagnosis: null }
                                      }));
                                    }
                                  }}
                                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                                    dischargeErrors[p._id]?.diagnosis ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200 focus:ring-navy-200"
                                  }`}
                                  placeholder="e.g. Acute Viral Fever, Resolved"
                                />
                                {dischargeErrors[p._id]?.diagnosis && (
                                  <p className="mt-1 text-xs font-medium text-rose-500">{dischargeErrors[p._id]?.diagnosis}</p>
                                )}
                              </div>
                              <div className="col-span-2">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-xs font-semibold text-slate-500">Discharge Medications</label>
                                  <span className="text-[10px] text-slate-400 font-mono font-sans">{getDischargeField(p._id, "medications").length}/1000</span>
                                </div>
                                <textarea
                                  value={getDischargeField(p._id, "medications")}
                                  maxLength={1000}
                                  onChange={e => setDischargeField(p._id, "medications", e.target.value)}
                                  rows={3}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                                  placeholder="List medications to continue after discharge..."
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-xs font-semibold text-slate-500">Follow-up Instructions</label>
                                  <span className="text-[10px] text-slate-400 font-mono font-sans">{getDischargeField(p._id, "followUp").length}/500</span>
                                </div>
                                <input
                                  type="text"
                                  value={getDischargeField(p._id, "followUp")}
                                  maxLength={500}
                                  onChange={e => setDischargeField(p._id, "followUp", e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                                  placeholder="e.g. OPD after 2 weeks"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-xs font-semibold text-slate-500">Special Instructions</label>
                                  <span className="text-[10px] text-slate-400 font-mono font-sans">{getDischargeField(p._id, "specialInstructions").length}/500</span>
                                </div>
                                <input
                                  type="text"
                                  value={getDischargeField(p._id, "specialInstructions")}
                                  maxLength={500}
                                  onChange={e => setDischargeField(p._id, "specialInstructions", e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                                  placeholder="e.g. Rest, avoid heavy lifting"
                                />
                              </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                              <button
                                onClick={() => handleFinalizeDischarge(p)}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60 transition-colors"
                              >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                {isSubmitting ? "Sending Request..." : "Send Discharge Request"}
                              </button>
                              <button
                                onClick={() => setDischargingId(null)}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Vitals Modal */}
      {isVitalsModalOpen && (
        <Modal
          title="Record Patient Vitals"
          isOpen={isVitalsModalOpen}
          onClose={() => setIsVitalsModalOpen(false)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Temperature (°F)"
                value={temp}
                charCount={temp.length}
                maxLength={10}
                error={tempError}
                onChange={(e) => {
                  setTemp(e.target.value);
                  if (tempError) setTempError(null);
                }}
                placeholder="e.g. 98.6"
              />
              <InputField
                label="Blood Pressure (mmHg)"
                value={bp}
                charCount={bp.length}
                maxLength={10}
                error={bpError}
                onChange={(e) => {
                  setBp(e.target.value);
                  if (bpError) setBpError(null);
                }}
                placeholder="e.g. 120/80"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Pulse Rate (bpm)"
                value={pulse}
                charCount={pulse.length}
                maxLength={5}
                error={pulseError}
                onChange={(e) => {
                  setPulse(e.target.value);
                  if (pulseError) setPulseError(null);
                }}
                placeholder="e.g. 72"
              />
              <InputField
                label="Respiratory Rate (/min)"
                value={resp}
                charCount={resp.length}
                maxLength={5}
                error={respError}
                onChange={(e) => {
                  setResp(e.target.value);
                  if (respError) setRespError(null);
                }}
                placeholder="e.g. 16"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Oxygen Saturation SpO₂ (%)"
                value={spo2}
                charCount={spo2.length}
                maxLength={5}
                error={spo2Error}
                onChange={(e) => {
                  setSpo2(e.target.value);
                  if (spo2Error) setSpo2Error(null);
                }}
                placeholder="e.g. 98"
              />
              <InputField
                label="Weight (kg)"
                value={weight}
                charCount={weight.length}
                maxLength={6}
                error={weightError}
                onChange={(e) => {
                  setWeight(e.target.value);
                  if (weightError) setWeightError(null);
                }}
                placeholder="e.g. 70"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => setIsVitalsModalOpen(false)} variant="secondary">
                Cancel
              </Button>
              <Button
                onClick={handleVitalsSubmit}
                disabled={saveVitalsMutation.isPending}
              >
                {saveVitalsMutation.isPending ? "Saving..." : "Save Vitals"}
              </Button>
            </div>
          </div>
        </Modal>
      )}


    </div>
  );
}
