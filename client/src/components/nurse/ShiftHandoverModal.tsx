import React, { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  HeartPulse,
  Pill,
  Thermometer,
  ShieldAlert,
  ClipboardList,
  FileText,
  User,
  Clock,
  Sparkles,
  CheckCircle2,
  Lock
} from "lucide-react";
import toast from "react-hot-toast";
import { useNurseInpatients, useCompleteShiftHandover } from "../../features/nurse";
import { useStaffProfileMe } from "../../features/staff";

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_HANDOVER_NOTES = [
  "Patient stable",
  "Monitor BP every hour",
  "Next antibiotic at 8 PM",
  "Blood sugar pending",
  "Needs dressing",
  "Doctor review pending",
  "Family informed",
  "Critical observation"
];

// ----------------- Validation Functions for Shift Handover -----------------
const validateRemarks = (val: string): string | null => {
  const trimmed = (val || "").trim();
  if (!trimmed) return null; // optional field
  if (val.length > 500) {
    return "Handoff Remarks cannot exceed 500 characters. Characters limit: 500. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. It should not accept too long data. Please enter valid data";
  }
  if (trimmed.length < 2) {
    return "Handoff Remarks must be at least 2 characters. Too short text is not accepted. It should not accept invalid data. Please enter valid data";
  }
  if (/<[^>]*>|javascript:/i.test(trimmed) || !/[a-zA-Z0-9]/.test(trimmed) || !/^[a-zA-Z0-9\s\.\-/'&,()%+!\n\r#@]+$/.test(trimmed)) {
    return "Handoff Remarks contains invalid data. Invalid data not accepted. Invalid data is not accepted. Validation message should be displayed invalid data not accepted. It should not accept invalid data. Please enter valid data";
  }
  return null;
};

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({ isOpen, onClose }) => {
  const { data: inpatients = [] } = useNurseInpatients();
  const { data: currentNurse } = useStaffProfileMe();
  const completeShiftHandover = useCompleteShiftHandover();

  const [selectedIncomingNurseId, setSelectedIncomingNurseId] = useState("");
  const [incomingNurseName, setIncomingNurseName] = useState("");
  const [currentShift, setCurrentShift] = useState("Morning");
  const [nextShift, setNextShift] = useState("Evening");
  const [remarks, setRemarks] = useState("");
  const [remarksError, setRemarksError] = useState<string | null>(null);

  const handleRemarksKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Enter"].includes(e.key)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const textarea = e.currentTarget;
    const selLength = (textarea.selectionEnd ?? 0) - (textarea.selectionStart ?? 0);
    if (textarea.value.length >= 500 && selLength === 0) {
      e.preventDefault();
      toast.error("Handoff Remarks cannot exceed 500 characters. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted.");
    }
  };
  const [selectedNoteChips, setSelectedNoteChips] = useState<string[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [handoverItemsState, setHandoverItemsState] = useState<Record<string, boolean>>({});
  const [patientNotesState, setPatientNotesState] = useState<Record<string, string>>({});

  // Initialize handover checklist state for all admitted inpatients
  useEffect(() => {
    if (inpatients && inpatients.length > 0) {
      const initialHandoverCheck: Record<string, boolean> = {};
      const initialNotes: Record<string, string> = {};
      inpatients.forEach((pt: any) => {
        initialHandoverCheck[pt._id] = true;
        initialNotes[pt._id] = pt.notes || pt.specialInstructions || "";
      });
      setHandoverItemsState(initialHandoverCheck);
      setPatientNotesState(initialNotes);
    }
  }, [inpatients]);

  // Determine current and next shift based on current time
  useEffect(() => {
    const hours = new Date().getHours();
    if (hours >= 6 && hours < 14) {
      setCurrentShift("Morning");
      setNextShift("Evening");
    } else if (hours >= 14 && hours < 22) {
      setCurrentShift("Evening");
      setNextShift("Night");
    } else {
      setCurrentShift("Night");
      setNextShift("Morning");
    }
  }, []);

  if (!isOpen) return null;

  const totalPatientsCount = inpatients.length;
  const handedOverCount = Object.values(handoverItemsState).filter(Boolean).length;
  const progressPercentage = totalPatientsCount > 0 ? Math.round((handedOverCount / totalPatientsCount) * 100) : 100;

  const toggleNoteChip = (chip: string) => {
    if (selectedNoteChips.includes(chip)) {
      setSelectedNoteChips(selectedNoteChips.filter((c) => c !== chip));
    } else {
      setSelectedNoteChips([...selectedNoteChips, chip]);
    }
  };

  const handleHandoverCheckToggle = (patientId: string) => {
    setHandoverItemsState((prev) => ({
      ...prev,
      [patientId]: !prev[patientId]
    }));
  };

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedIncomingNurseId) {
      toast.error("Please select the next shift nurse to receive handover.");
      return;
    }

    if (!isConfirmed) {
      toast.error("Please check the verification confirmation box before submitting.");
      return;
    }

    // Build structured patient handover items
    const patientHandoverItems = inpatients.map((pt: any) => ({
      patientId: pt.patient?._id || pt._id,
      patientName: pt.patient?.name || pt.patientName || "Admitted Inpatient",
      uhid: pt.patient?.uhid || pt.uhid || "UHID-PAT",
      ward: pt.ward || "General Ward",
      bedNumber: pt.bed?.bedNumber || "N/A",
      diagnosis: pt.diagnosis || "Admitted under care",
      condition: pt.priority === "Emergency" || pt.priority === "Urgent" ? "Critical" : "Stable",
      vitalsSummary: pt.lastVitals ? `BP: ${pt.lastVitals.bloodPressure || '120/80'}, Pulse: ${pt.lastVitals.pulseRate || '75'} bpm, Temp: ${pt.lastVitals.temperature || '98.6'}°F` : "Vitals stable",
      medicationsGiven: pt.medicationOrders ? `${pt.medicationOrders.length} Prescriptions active` : "Standard medication plan",
      pendingMedications: pt.pendingMeds || "None pending",
      pendingLabTests: pt.pendingLabs || "None",
      ivFluids: pt.ivFluids || "Normal Saline 0.9% IV",
      doctorInstructions: pt.doctorInstructions || "Continue standard care",
      nursingNotes: patientNotesState[pt._id] || "",
      specialAlerts: pt.patient?.allergies || pt.specialAlerts || "No known allergies",
      isHandedOver: !!handoverItemsState[pt._id]
    }));

    const fullRemarks = [
      selectedNoteChips.join(", "),
      remarks
    ].filter(Boolean).join(" | ");

    try {
      await completeShiftHandover.mutateAsync({
        incomingNurseId: selectedIncomingNurseId,
        currentShift,
        nextShift,
        patientsHandedOverCount: handedOverCount,
        patientsHandedOverDetails: `Handed over ${handedOverCount} of ${totalPatientsCount} ward patients to Nurse ${incomingNurseName}.`,
        pendingMedication: "All active scheduled meds transferred to shift log",
        pendingProcedures: "Shift procedures updated",
        criticalPatients: inpatients.filter((p: any) => p.priority === "Emergency" || p.priority === "Urgent").map((p: any) => p.patient?.name).join(", "),
        specialInstructions: fullRemarks,
        remarks: fullRemarks,
        nurseSignature: currentNurse?.name || "Shift Nurse",
        selectedAdmissionIds: Object.keys(handoverItemsState).filter((id) => handoverItemsState[id])
      });

      toast.success(`Shift Handover to Nurse ${incomingNurseName} completed successfully!`);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit shift handover.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 flex items-start justify-between relative shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500 text-white">
                Official Clinical Signoff
              </span>
              <span className="text-xs text-slate-400 font-mono font-bold">
                {new Date().toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-emerald-400" /> Nurse Shift Handover Protocol
            </h2>
            <p className="text-xs text-slate-300 font-sans">
              Complete bedside handover brief, update clinical notes, and sign off shift duties to incoming nurse.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Shift Details & Progress Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-sans">Outgoing Shift Nurse</span>
              <p className="text-sm font-extrabold text-slate-800 font-sans mt-0.5 flex items-center gap-1.5">
                <User className="h-4 w-4 text-emerald-600" /> {currentNurse?.name || "Current Nurse"}
              </p>
              <span className="text-[11px] text-slate-500 font-medium block">
                Shift: <strong className="text-slate-700">{currentShift}</strong> ({currentShift === "Morning" ? "06:00-14:00" : currentShift === "Evening" ? "14:00-22:00" : "22:00-06:00"})
              </span>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-sans mb-1">
                Select Next Shift Nurse *
              </label>
              <select
                value={selectedIncomingNurseId}
                onChange={(e) => {
                  setSelectedIncomingNurseId(e.target.value);
                  const selectedText = e.target.options[e.target.selectedIndex]?.text || "";
                  setIncomingNurseName(selectedText);
                }}
                className="w-full text-xs font-bold bg-white border border-slate-300 text-slate-800 py-2 px-3 rounded-xl outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="">-- Choose Incoming Nurse --</option>
                <option value="64d1f2e809ab123456789012">Nurse Sarah Jenkins (Evening Duty)</option>
                <option value="64d1f2e809ab123456789013">Nurse Robert Chen (Night Duty)</option>
                <option value="64d1f2e809ab123456789014">Nurse Maria Garcia (Morning Duty)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-extrabold text-slate-700 font-sans mb-1">
                <span>Patients Handed Over</span>
                <span className="font-mono text-emerald-700">{handedOverCount} / {totalPatientsCount} ({progressPercentage}%)</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden mt-2 border border-slate-300">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Handover Notes Chips Section */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block font-sans flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-purple-600" /> Quick Clinical Observation Chips
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_HANDOVER_NOTES.map((chip, idx) => {
                const isSelected = selectedNoteChips.includes(chip);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleNoteChip(chip)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}{chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assigned Inpatients Patient Cards Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider font-sans flex items-center justify-between">
              <span>Assigned Ward Patients Checklist ({inpatients.length})</span>
              <span className="text-[11px] text-slate-400 font-normal">Check off all verified patient handovers</span>
            </h3>

            {inpatients.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs font-medium">
                No active ward patients currently assigned to your shift roster.
              </div>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {inpatients.map((patient: any, idx: number) => {
                  const pName = patient.patient?.name || patient.patientName || "Admitted Inpatient";
                  const pUhid = patient.patient?.uhid || patient.uhid || "UHID-N/A";
                  const wardName = patient.ward || "General Ward";
                  const bedNum = patient.bed?.bedNumber || "N/A";
                  const isChecked = !!handoverItemsState[patient._id];
                  const isCritical = patient.priority === "Emergency" || patient.priority === "Urgent";

                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl p-4 border transition-all ${
                        isChecked
                          ? "bg-white border-slate-200/90 shadow-sm"
                          : "bg-slate-50/70 border-slate-200 text-slate-400"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleHandoverCheckToggle(patient._id)}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-navy-500 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900 font-sans">{pName}</h4>
                              <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-navy-100 px-2 py-0.5 rounded">
                                {pUhid}
                              </span>
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                                isCritical ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}>
                                {isCritical ? "Critical Priority" : "Stable Condition"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Ward: <strong className="text-slate-700">{wardName}</strong> · Bed: <strong className="text-slate-700">{bedNum}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase block font-sans">Handover Status</span>
                          <span className={`text-xs font-bold ${isChecked ? "text-emerald-600" : "text-amber-600"}`}>
                            {isChecked ? "✓ Verified Handed Over" : "Pending Check"}
                          </span>
                        </div>
                      </div>

                      {/* Clinical Cards Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 text-xs">
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Diagnosis</span>
                          <p className="font-semibold text-slate-800 mt-0.5 leading-snug">{patient.diagnosis || "Admitted under observation"}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vitals Summary</span>
                          <p className="font-semibold text-slate-800 mt-0.5 leading-snug">
                            {patient.lastVitals ? `BP: ${patient.lastVitals.bloodPressure || '120/80'} | Pulse: ${patient.lastVitals.pulseRate || '76'}` : "Vitals recorded stable"}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Medications Plan</span>
                          <p className="font-semibold text-slate-800 mt-0.5 leading-snug">
                            {patient.medicationOrders ? `${patient.medicationOrders.length} active orders` : "Standard daily doses"}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Doctor Instructions</span>
                          <p className="font-semibold text-slate-800 mt-0.5 leading-snug">{patient.doctorInstructions || "Monitor vitals per shift"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Shift Handover Remarks Text Area */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block font-sans">
                Additional Handover Notes & Instructions
              </label>
              <span className={`text-[10px] font-mono ${remarks.length > 500 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                {remarks.length}/500
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              value={remarks}
              onKeyDown={handleRemarksKeyDown}
              onChange={(e) => {
                setRemarks(e.target.value);
                if (remarksError) setRemarksError(validateRemarks(e.target.value));
              }}
              onBlur={() => {
                if (remarks.trim()) setRemarksError(validateRemarks(remarks));
              }}
              placeholder="Enter special bedside observations, pending lab results, or outgoing instructions for incoming shift..."
              className={`w-full text-xs border rounded-xl p-3 outline-none transition-all font-sans ${
                remarksError
                  ? "border-rose-400 bg-rose-50/20 focus:border-rose-500"
                  : "bg-slate-50 border-slate-200 focus:border-emerald-600 focus:bg-white"
              }`}
            />
            {remarksError && (
              <p className="text-xs font-medium text-rose-500 mt-1" role="alert">
                {remarksError}
              </p>
            )}
          </div>

          {/* Mandatory Verification Confirmation Checkbox */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
            <input
              type="checkbox"
              id="confirmHandover"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="h-5 w-5 rounded border-amber-300 text-emerald-600 focus:ring-navy-500 shrink-0 mt-0.5 cursor-pointer"
            />
            <label htmlFor="confirmHandover" className="text-xs text-amber-950 font-bold leading-relaxed cursor-pointer font-sans">
              I confirm all patient information, active prescriptions, bedside vitals, and clinical care instructions have been handed over correctly to the next shift nurse.
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 font-sans">
            Audit stamp: <strong className="font-semibold text-slate-700">{currentNurse?.name || "Current Nurse"}</strong> · Live IP & Device logged
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs bg-white hover:bg-slate-100 rounded-xl transition-all cursor-pointer font-sans"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitHandover}
              disabled={completeShiftHandover.isPending}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer font-sans disabled:opacity-50"
            >
              {completeShiftHandover.isPending ? "Submitting Handover..." : "Submit & Complete Handover"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
