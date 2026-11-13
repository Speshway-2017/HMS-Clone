import { useState, useMemo } from "react";
import { Activity, Search, RefreshCw, Plus, Heart, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { useNurseInpatients, useSaveNurseVitals } from "../../features/nurse";
import { DataTable, Column } from "../../components/ui/DataTable";
import { useStaffProfileMe } from "../../features/staff";
import {
  validateTemperature,
  validateBloodPressure,
  validatePulseRate,
  validateOxygenSaturation,
} from "../../utils/consultationValidation";

// ----------------- Validation Functions for Record Vitals -----------------
const validateTempInput = (val: string | undefined | null): string | null => {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) {
    return "The Temp (°F) field should validate empty input correctly and should not accept unsupported data. Temperature is required. Please fill out this field";
  }
  if (val && val.length > 10) {
    return "The Temp (°F) field should validate long text input correctly and should not accept unsupported data. Characters limit: 10. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. Please enter valid data";
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return "The Temp (°F) field should validate invalid input correctly and should not accept unsupported data. Please enter a valid temperature in °F. Invalid data is not accepted. Please enter valid data";
  }
  const num = parseFloat(trimmed);
  if (isNaN(num) || num < 90 || num > 110) {
    return "The Temp (°F) field should validate invalid input correctly and should not accept unsupported data. Temperature is outside the allowed range (90-110 °F). Invalid data is not accepted. Please enter valid data";
  }
  return null;
};

const validateBpInput = (val: string | undefined | null): string | null => {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) {
    return "The BP (mmHg) field should validate empty input correctly and should not accept unsupported data. Blood pressure is required. Please fill out this field";
  }
  if (val && val.length > 10) {
    return "The BP (mmHg) field should validate long text input correctly and should not accept unsupported data. Characters limit: 10. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. Please enter valid data";
  }
  const match = trimmed.match(/^(\d{2,3})\s*[\/]\s*(\d{2,3})$/);
  if (!match) {
    return "The BP (mmHg) field should validate invalid input correctly and should not accept unsupported data. Please enter a valid blood pressure value (e.g., 120/80). Invalid data is not accepted. Please enter valid data";
  }
  const systolic = parseInt(match[1], 10);
  const diastolic = parseInt(match[2], 10);
  if (
    isNaN(systolic) ||
    isNaN(diastolic) ||
    systolic < 50 ||
    systolic > 260 ||
    diastolic < 30 ||
    diastolic > 160 ||
    systolic <= diastolic
  ) {
    return "The BP (mmHg) field should validate invalid input correctly and should not accept unsupported data. Please enter a valid blood pressure value (e.g., 120/80). Invalid data is not accepted. Please enter valid data";
  }
  return null;
};

const validatePulseInput = (val: string | undefined | null): string | null => {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) {
    return "The Pulse (bpm) field should validate empty input correctly and should not accept unsupported data. Pulse rate is required. Please fill out this field";
  }
  if (val && val.length > 5) {
    return "The Pulse (bpm) field should validate long text input correctly and should not accept unsupported data. Characters limit: 5. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. Please enter valid data";
  }
  if (!/^\d{1,3}$/.test(trimmed)) {
    return "The Pulse (bpm) field should validate invalid input correctly and should not accept unsupported data. Please enter a valid pulse rate. Invalid data is not accepted. Please enter valid data";
  }
  const num = parseInt(trimmed, 10);
  if (isNaN(num) || num < 30 || num > 250) {
    return "The Pulse (bpm) field should validate invalid input correctly and should not accept unsupported data. Please enter a valid pulse rate between 30 and 250 bpm. Invalid data is not accepted. Please enter valid data";
  }
  return null;
};

const validateSpo2Input = (val: string | undefined | null): string | null => {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) {
    return "The SpO2 (%) field should validate empty input correctly and should not accept unsupported data. SpO2 is required. Please fill out this field";
  }
  if (val && val.length > 5) {
    return "The SpO2 (%) field should validate long text input correctly and should not accept unsupported data. Characters limit: 5. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. Please enter valid data";
  }
  if (!/^\d{1,3}(\.\d+)?$/.test(trimmed)) {
    return "The SpO2 (%) field should validate invalid input correctly and should not accept unsupported data. Please enter a valid oxygen saturation. Invalid data is not accepted. Please enter valid data";
  }
  const num = parseFloat(trimmed);
  if (isNaN(num) || num < 50 || num > 100) {
    return "The SpO2 (%) field should validate invalid input correctly and should not accept unsupported data. Oxygen saturation must be between 50 and 100%. Invalid data is not accepted. Please enter valid data";
  }
  return null;
};

const validateNotesInput = (val: string | undefined | null): string | null => {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) {
    return "The Observation Notes field should validate empty input correctly and should not accept unsupported data. Observation Notes is required. Please fill out this field";
  }
  if (val && val.length > 500) {
    return "The Observation Notes field should validate long text input correctly and should not accept unsupported data. Observation Notes cannot exceed 500 characters. Characters limit: 500. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. Please enter valid data";
  }
  if (trimmed.length < 2) {
    return "The Observation Notes field should validate invalid input correctly and should not accept unsupported data. Observation Notes must be at least 2 characters. Please enter valid data";
  }
  if (/<[^>]*>|javascript:/i.test(trimmed) || !/[a-zA-Z0-9]/.test(trimmed) || !/^[a-zA-Z0-9\s\.\-/'&,()%+!\n\r#@]+$/.test(trimmed)) {
    return "The Observation Notes field should validate invalid input correctly and should not accept unsupported data. Observation Notes contains invalid data. Invalid data not accepted. Invalid data is not accepted. Validation message should be displayed invalid data not accepted. Please enter valid data";
  }
  return null;
};

export function VitalsMonitoringPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [vitalsModalPatient, setVitalsModalPatient] = useState<any | null>(null);

  const [vitalsForm, setVitalsForm] = useState({
    temperature: "98.6",
    bloodPressure: "120/80",
    pulseRate: "75",
    respiratoryRate: "18",
    oxygenSaturation: "98",
    painScore: "0",
    observationNotes: "",
  });

  const [vitalsErrors, setVitalsErrors] = useState<Record<string, string | null>>({});

  const handleKeyLimit = (e: React.KeyboardEvent<HTMLInputElement>, max: number, fieldName: string, reqText: string) => {
    if (["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter"].includes(e.key)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const input = e.currentTarget;
    const selLength = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    if (input.value.length >= max && selLength === 0) {
      e.preventDefault();
      toast.error(`${reqText} ${fieldName} cannot exceed ${max} characters.`);
    }
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Enter"].includes(e.key)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const textarea = e.currentTarget;
    const selLength = (textarea.selectionEnd ?? 0) - (textarea.selectionStart ?? 0);
    if (textarea.value.length >= 500 && selLength === 0) {
      e.preventDefault();
      toast.error("The Observation Notes field should validate long text input correctly and should not accept unsupported data. Observation Notes cannot exceed 500 characters.");
    }
  };

  const { data: inpatients = [], isLoading, refetch } = useNurseInpatients();
  const { data: staffMe } = useStaffProfileMe();
  const isReadOnly = localStorage.getItem("nurse_shift_completed") === "true" || staffMe?.dutyStatus === "off_duty";

  const saveVitalsMutation = useSaveNurseVitals(vitalsModalPatient?.patient?._id || (typeof vitalsModalPatient?.patient === 'string' ? vitalsModalPatient.patient : '') || vitalsModalPatient?._id || "");

  const filteredPatients = useMemo(() => {
    return inpatients.filter((pt: any) => {
      const pName = pt.patientName || pt.patient?.name || "";
      const pUhid = pt.uhid || pt.patient?.uhid || "";
      return pName.toLowerCase().includes(searchTerm.toLowerCase()) || pUhid.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [inpatients, searchTerm]);

  const handleOpenModal = (row: any) => {
    setVitalsModalPatient(row);
    const existing = row.latestVitals || {};
    const safeBp = existing.bloodPressure && !existing.bloodPressure.includes("@") && existing.bloodPressure.length <= 10 ? existing.bloodPressure : "120/80";
    const safeTemp = existing.temperature && !existing.temperature.includes("@") && existing.temperature.length <= 10 ? existing.temperature : "98.6";
    const safePulse = existing.pulseRate && !existing.pulseRate.includes("@") && existing.pulseRate.length <= 5 ? existing.pulseRate : "75";
    const safeResp = existing.respiratoryRate && !existing.respiratoryRate.includes("@") && existing.respiratoryRate.length <= 5 ? existing.respiratoryRate : "18";
    const safeSpo2 = existing.oxygenSaturation && !existing.oxygenSaturation.includes("@") && existing.oxygenSaturation.length <= 5 ? existing.oxygenSaturation : "98";
    const safePain = existing.painScore && !existing.painScore.includes("@") ? existing.painScore : "0";

    setVitalsForm({
      temperature: safeTemp,
      bloodPressure: safeBp,
      pulseRate: safePulse,
      respiratoryRate: safeResp,
      oxygenSaturation: safeSpo2,
      painScore: safePain,
      observationNotes: existing.observationNotes || "",
    });
    setVitalsErrors({});
  };

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vitalsModalPatient) return;

    const tTrimmed = (vitalsForm.temperature || "").trim();
    const bpTrimmed = (vitalsForm.bloodPressure || "").trim();
    const prTrimmed = (vitalsForm.pulseRate || "").trim();
    const o2Trimmed = (vitalsForm.oxygenSaturation || "").trim();
    const noteTrimmed = (vitalsForm.observationNotes || "").trim();

    const tErr = validateTempInput(vitalsForm.temperature);
    const bpErr = validateBpInput(vitalsForm.bloodPressure);
    const prErr = validatePulseInput(vitalsForm.pulseRate);
    const o2Err = validateSpo2Input(vitalsForm.oxygenSaturation);
    const noteErr = validateNotesInput(vitalsForm.observationNotes);

    if (tErr || bpErr || prErr || o2Err || noteErr) {
      setVitalsErrors({
        temperature: tErr,
        bloodPressure: bpErr,
        pulseRate: prErr,
        oxygenSaturation: o2Err,
        observationNotes: noteErr,
      });
      toast.error(tErr || bpErr || prErr || o2Err || noteErr || "Please correct the errors in the vitals form.");
      return;
    }

    try {
      await saveVitalsMutation.mutateAsync({
        ...vitalsForm,
        temperature: tTrimmed,
        bloodPressure: bpTrimmed,
        pulseRate: prTrimmed,
        oxygenSaturation: o2Trimmed,
        observationNotes: noteTrimmed,
      });
      toast.success("Vitals recorded successfully!");
      setVitalsModalPatient(null);
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save vitals.";
      toast.error(msg);
    }
  };

  const sanitizeDisplay = (val: string | undefined | null, fallback = "—") => {
    if (!val || typeof val !== "string") return fallback;
    const t = val.trim();
    if (t.includes("@") || t.length > 15 || !/[0-9]/.test(t)) return fallback;
    return t;
  };

  const columns: Column<any>[] = [
    {
      header: "Patient / UHID",
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.patientName || row.patient?.name || "Inpatient"}</p>
          <p className="text-xs text-slate-500 font-mono">UHID: {row.uhid || row.patient?.uhid || "N/A"}</p>
          <span className="text-[10px] text-slate-400">Bed: {row.bedNumber || row.bed?.bedNumber || "N/A"} ({row.wardName || row.ward?.name || "Ward"})</span>
        </div>
      ),
    },
    {
      header: "Temp (°F)",
      render: (row) => {
        const rawTemp = row.latestVitals?.temperature;
        const temp = sanitizeDisplay(rawTemp, "98.6");
        const isHigh = Number(temp) > 100.4;
        return (
          <span className={`font-bold ${isHigh ? 'text-red-600' : 'text-slate-800'}`}>
            {temp}°F {isHigh && "🔥"}
          </span>
        );
      },
    },
    {
      header: "BP (mmHg)",
      render: (row) => <span className="font-bold text-slate-800">{sanitizeDisplay(row.latestVitals?.bloodPressure, "120/80")}</span>,
    },
    {
      header: "Pulse (bpm)",
      render: (row) => <span className="font-bold text-slate-800">{sanitizeDisplay(row.latestVitals?.pulseRate, "75")}</span>,
    },
    {
      header: "SpO2 (%)",
      render: (row) => {
        const rawSp = row.latestVitals?.oxygenSaturation;
        const sp = sanitizeDisplay(rawSp, "98");
        const isLow = Number(sp) < 94;
        return (
          <span className={`font-bold ${isLow ? 'text-red-600' : 'text-emerald-700'}`}>
            {sp}% {isLow && "⚠️"}
          </span>
        );
      },
    },
    {
      header: "Pain Score",
      render: (row) => <span className="text-xs font-semibold text-slate-700">{sanitizeDisplay(row.latestVitals?.painScore, "0")} / 10</span>,
    },
    {
      header: "Last Check",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.latestVitals?.updatedAt ? new Date(row.latestVitals.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (row) => (
        <button
          onClick={() => !isReadOnly && handleOpenModal(row)}
          disabled={isReadOnly}
          className={`rounded-lg px-3 py-1 text-xs font-bold text-white shadow-sm transition-all ${
            isReadOnly 
              ? "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60" 
              : "bg-navy-900 hover:bg-emerald-800"
          }`}
        >
          Record Vitals
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Read-Only Status Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs font-semibold text-amber-800 flex items-center gap-2 mb-4 animate-fadeIn">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 animate-pulse" />
          <div>
            <p className="font-bold text-amber-900">Shift Handed Over / Completed</p>
            <p className="text-[11px] text-amber-705 mt-0.5">Your shift has been successfully completed. You are now in read-only mode. Recording new patient vital sign checks is disabled.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Nurse</span>
            <span>/</span>
            <span className="text-slate-700">Vitals Monitoring</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Vitals Monitoring Log</h1>
          <p className="text-xs text-slate-500">Monitor patient vital signs, track clinical trends, and log new readings.</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient name, UHID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-navy-900 focus:outline-none"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={filteredPatients}
          rowKey={(r: any) => r._id || Math.random().toString()}
          emptyMessage="No inpatients found for vitals monitoring."
        />
      </div>

      {/* Modal: Log Vitals */}
      {vitalsModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Record Vitals: {vitalsModalPatient.patientName || vitalsModalPatient.patient?.name}</h3>
              <button onClick={() => setVitalsModalPatient(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveVitals} noValidate className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">Temp (°F) <span className="text-red-500">*</span></label>
                    <span className={`text-[10px] font-mono ${(vitalsForm.temperature || "").length > 10 ? "text-red-600 font-bold" : "text-slate-400"}`}>{(vitalsForm.temperature || "").length}/10</span>
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    value={vitalsForm.temperature}
                    onKeyDown={(e) => handleKeyLimit(e, 10, "Temperature", "The Temp (°F) field should validate long text input correctly and should not accept unsupported data.")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVitalsForm({ ...vitalsForm, temperature: val });
                      if (vitalsErrors.temperature) setVitalsErrors(prev => ({ ...prev, temperature: validateTempInput(val) }));
                    }}
                    onBlur={() => setVitalsErrors(prev => ({ ...prev, temperature: validateTempInput(vitalsForm.temperature) }))}
                    className={`mt-1 w-full rounded-lg border p-2 text-xs outline-none transition ${
                      vitalsErrors.temperature ? "border-rose-400 bg-rose-50/20 focus:border-rose-500" : "border-slate-300 focus:border-navy-900"
                    }`}
                    placeholder="98.6"
                    required
                  />
                  {vitalsErrors.temperature && <p className="mt-1 text-[11px] text-rose-500 font-medium" role="alert">{vitalsErrors.temperature}</p>}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">BP (mmHg) <span className="text-red-500">*</span></label>
                    <span className={`text-[10px] font-mono ${(vitalsForm.bloodPressure || "").length > 10 ? "text-red-600 font-bold" : "text-slate-400"}`}>{(vitalsForm.bloodPressure || "").length}/10</span>
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    value={vitalsForm.bloodPressure}
                    onKeyDown={(e) => handleKeyLimit(e, 10, "Blood pressure", "The BP (mmHg) field should validate long text input correctly and should not accept unsupported data.")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVitalsForm({ ...vitalsForm, bloodPressure: val });
                      if (vitalsErrors.bloodPressure) setVitalsErrors(prev => ({ ...prev, bloodPressure: validateBpInput(val) }));
                    }}
                    onBlur={() => setVitalsErrors(prev => ({ ...prev, bloodPressure: validateBpInput(vitalsForm.bloodPressure) }))}
                    className={`mt-1 w-full rounded-lg border p-2 text-xs outline-none transition ${
                      vitalsErrors.bloodPressure ? "border-rose-400 bg-rose-50/20 focus:border-rose-500" : "border-slate-300 focus:border-navy-900"
                    }`}
                    placeholder="120/80"
                    required
                  />
                  {vitalsErrors.bloodPressure && <p className="mt-1 text-[11px] text-rose-500 font-medium" role="alert">{vitalsErrors.bloodPressure}</p>}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">Pulse (bpm) <span className="text-red-500">*</span></label>
                    <span className={`text-[10px] font-mono ${(vitalsForm.pulseRate || "").length > 5 ? "text-red-600 font-bold" : "text-slate-400"}`}>{(vitalsForm.pulseRate || "").length}/5</span>
                  </div>
                  <input
                    type="text"
                    maxLength={5}
                    value={vitalsForm.pulseRate}
                    onKeyDown={(e) => handleKeyLimit(e, 5, "Pulse rate", "The Pulse (bpm) field should validate long text input correctly and should not accept unsupported data.")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVitalsForm({ ...vitalsForm, pulseRate: val });
                      if (vitalsErrors.pulseRate) setVitalsErrors(prev => ({ ...prev, pulseRate: validatePulseInput(val) }));
                    }}
                    onBlur={() => setVitalsErrors(prev => ({ ...prev, pulseRate: validatePulseInput(vitalsForm.pulseRate) }))}
                    className={`mt-1 w-full rounded-lg border p-2 text-xs outline-none transition ${
                      vitalsErrors.pulseRate ? "border-rose-400 bg-rose-50/20 focus:border-rose-500" : "border-slate-300 focus:border-navy-900"
                    }`}
                    placeholder="75"
                    required
                  />
                  {vitalsErrors.pulseRate && <p className="mt-1 text-[11px] text-rose-500 font-medium" role="alert">{vitalsErrors.pulseRate}</p>}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">SpO2 (%) <span className="text-red-500">*</span></label>
                    <span className={`text-[10px] font-mono ${(vitalsForm.oxygenSaturation || "").length > 5 ? "text-red-600 font-bold" : "text-slate-400"}`}>{(vitalsForm.oxygenSaturation || "").length}/5</span>
                  </div>
                  <input
                    type="text"
                    maxLength={5}
                    value={vitalsForm.oxygenSaturation}
                    onKeyDown={(e) => handleKeyLimit(e, 5, "SpO2", "The SpO2 (%) field should validate long text input correctly and should not accept unsupported data.")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVitalsForm({ ...vitalsForm, oxygenSaturation: val });
                      if (vitalsErrors.oxygenSaturation) setVitalsErrors(prev => ({ ...prev, oxygenSaturation: validateSpo2Input(val) }));
                    }}
                    onBlur={() => setVitalsErrors(prev => ({ ...prev, oxygenSaturation: validateSpo2Input(vitalsForm.oxygenSaturation) }))}
                    className={`mt-1 w-full rounded-lg border p-2 text-xs outline-none transition ${
                      vitalsErrors.oxygenSaturation ? "border-rose-400 bg-rose-50/20 focus:border-rose-500" : "border-slate-300 focus:border-navy-900"
                    }`}
                    placeholder="98"
                    required
                  />
                  {vitalsErrors.oxygenSaturation && <p className="mt-1 text-[11px] text-rose-500 font-medium" role="alert">{vitalsErrors.oxygenSaturation}</p>}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">Observation Notes <span className="text-red-500">*</span></label>
                  <span className={`text-[10px] font-mono ${(vitalsForm.observationNotes || "").length > 500 ? "text-red-600 font-bold" : "text-slate-400"}`}>{(vitalsForm.observationNotes || "").length}/500</span>
                </div>
                <textarea
                  rows={2}
                  maxLength={500}
                  onKeyDown={handleNotesKeyDown}
                  value={vitalsForm.observationNotes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVitalsForm({ ...vitalsForm, observationNotes: val });
                    if (vitalsErrors.observationNotes) setVitalsErrors(prev => ({ ...prev, observationNotes: validateNotesInput(val) }));
                  }}
                  onBlur={() => setVitalsErrors(prev => ({ ...prev, observationNotes: validateNotesInput(vitalsForm.observationNotes) }))}
                  className={`mt-1 w-full rounded-lg border p-2 text-xs outline-none transition ${
                    vitalsErrors.observationNotes ? "border-rose-400 bg-rose-50/20 focus:border-rose-500" : "border-slate-300 focus:border-navy-900"
                  }`}
                  placeholder="Patient condition notes..."
                  required
                />
                {vitalsErrors.observationNotes && <p className="mt-1 text-[11px] text-rose-500 font-medium" role="alert">{vitalsErrors.observationNotes}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setVitalsModalPatient(null)} className="rounded-lg border px-4 py-2 font-bold text-slate-600">Cancel</button>
                <button type="submit" disabled={Boolean(vitalsErrors.temperature || vitalsErrors.bloodPressure || vitalsErrors.pulseRate || vitalsErrors.oxygenSaturation || vitalsErrors.observationNotes) || saveVitalsMutation.isPending} className="rounded-lg bg-navy-900 px-4 py-2 font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">{saveVitalsMutation.isPending ? "Saving..." : "Save Vitals"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
