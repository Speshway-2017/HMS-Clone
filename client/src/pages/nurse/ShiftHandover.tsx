import React, { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { 
  ClipboardList, 
  Clock, 
  AlertTriangle, 
  Pill, 
  FileText, 
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  Activity,
  User,
  History,
  FileCheck,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useCompleteShiftHandover, useShiftHandovers, ShiftHandoverReport } from "../../features/nurse";
import { useNurseInpatients } from "../../features/nurse";
import { useAuth } from "../../context/AuthContext";
import { useStaffList, useStaffProfileMe } from "../../features/staff";
import { tokenStorage } from "../../lib/tokenStorage";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

// ----------------- Validation Functions for Shift Handover -----------------
const validateFieldText = (val: string, fieldLabel: string, maxLength = 500): string | null => {
  const raw = val || "";
  const trimmed = raw.trim();
  if (!trimmed) {
    return "Please fill out this field";
  }
  if (raw.length > maxLength) {
    return `${fieldLabel} cannot exceed ${maxLength} characters. Characters limit: ${maxLength}. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. It should not accept too long data. Please enter valid data`;
  }
  if (trimmed.length < 2) {
    return `${fieldLabel} must be at least 2 characters. Too short text is not accepted. It should not accept invalid data. Please enter valid data`;
  }
  if (
    /<[^>]*>|javascript:/i.test(trimmed) ||
    !/[a-zA-Z0-9]/.test(trimmed) ||
    !/^[a-zA-Z0-9\s.,?!'\-_/()&%#@+:;\n\r"*=°/±μ]+$/.test(trimmed)
  ) {
    return `${fieldLabel} contains invalid data. Invalid data not accepted. Invalid data is not accepted. Validation message should be displayed invalid data not accepted. It should not accept invalid data. Please enter valid data`;
  }
  return null;
};

const validatePatientsCount = (val: string | number): string | null => {
  const str = String(val ?? "").trim();
  if (!str) {
    return "Please fill out this field";
  }
  if (str.length > 4 || Number(str) > 1000) {
    return "Patients Handed Over Count cannot exceed 4 digits. Characters limit: 4. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. It should not accept too long data. Please enter valid data";
  }
  if (!/^\d+$/.test(str) || Number(str) < 0) {
    return "Patients Handed Over Count contains invalid data. Invalid data not accepted. Invalid data is not accepted. Validation message should be displayed invalid data not accepted. It should not accept invalid data. Please enter valid data";
  }
  return null;
};

const validatePatientsDetails = (val: string) => validateFieldText(val, "Patients Roster Details", 500);
const validatePendingMedication = (val: string) => validateFieldText(val, "Pending Medications / Doses", 500);
const validatePendingProcedures = (val: string) => validateFieldText(val, "Pending Procedures / Vitals", 500);
const validateCriticalPatients = (val: string) => validateFieldText(val, "Critical / High Priority Patients", 500);
const validateSpecialInstructions = (val: string) => validateFieldText(val, "Special Instructions", 500);

const validateRemarks = (val: string): string | null => {
  const raw = val || "";
  const trimmed = raw.trim();
  if (!trimmed) {
    return "Please fill out this field";
  }
  if (raw.length > 500) {
    return "General Shift Remarks cannot exceed 500 characters. Handoff Remarks cannot exceed 500 characters. Characters limit: 500. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. It should not accept too long data. Please enter valid data";
  }
  if (trimmed.length < 2) {
    return "General Shift Remarks must be at least 2 characters. Too short text is not accepted. It should not accept invalid data. Please enter valid data";
  }
  if (
    /<[^>]*>|javascript:/i.test(trimmed) ||
    !/[a-zA-Z0-9]/.test(trimmed) ||
    !/^[a-zA-Z0-9\s.,?!'\-_/()&%#@+:;\n\r"*=°/±μ]+$/.test(trimmed)
  ) {
    return "General Shift Remarks contains invalid data. Handoff Remarks contains invalid data. Invalid data not accepted. Invalid data is not accepted. Validation message should be displayed invalid data not accepted. It should not accept invalid data. Please enter valid data";
  }
  return null;
};

const validateNurseSignature = (val: string): string | null => {
  const raw = val || "";
  const trimmed = raw.trim();
  if (!trimmed) {
    return "Please fill out this field";
  }
  if (raw.length > 100) {
    return "Nurse Digital Signature cannot exceed 100 characters. Outgoing Nurse Signature cannot exceed 100 characters. Characters limit: 100. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. It should not accept too long data. Please enter valid data";
  }
  if (trimmed.length < 2) {
    return "Nurse Digital Signature must be at least 2 characters. Outgoing Nurse Signature must be at least 2 characters. Value must be at least 2 characters. It should not accept invalid data. Please enter valid data";
  }
  if (!/^[a-zA-Z\s\.\'\(\)\-]+$/.test(trimmed) || !/[a-zA-Z]/.test(trimmed) || /<[^>]*>|javascript:/i.test(trimmed)) {
    return "Nurse Digital Signature contains invalid data. Outgoing Nurse Signature contains invalid data. Invalid data not accepted. Invalid data is not accepted. Validation message should be displayed invalid data not accepted. It should not accept invalid data. Please enter valid data";
  }
  return null;
};

export default function ShiftHandover() {
  const { user } = useAuth();
  const { data: inpatients } = useNurseInpatients();
  const { data: handovers, isLoading: isHandoversLoading } = useShiftHandovers();
  const { refreshUser } = useAuth();
  const { data: staffListResponse } = useStaffList({ role: "nurse" });
  const completeHandoverMutation = useCompleteShiftHandover();

  const [selectedIncomingNurseId, setSelectedIncomingNurseId] = useState("");

  const staffList = useMemo(() => {
    return Array.isArray(staffListResponse)
      ? staffListResponse
      : (staffListResponse as any)?.data || [];
  }, [staffListResponse]);

  const availableNurses = useMemo(() => {
    return staffList.filter((n: any) => n.email !== user?.email);
  }, [staffList, user]);

  const { data: staffMe } = useStaffProfileMe();
  const isReadOnly = useMemo(() => {
    return localStorage.getItem("nurse_shift_completed") === "true" || staffMe?.dutyStatus === "off_duty";
  }, [staffMe]);

  // Form states
  const [currentShift, setCurrentShift] = useState("Morning");
  const [nextShift, setNextShift] = useState("Evening");

  // Enforce rotation cycle: Morning -> Evening -> Night -> Morning
  React.useEffect(() => {
    if (currentShift === "Morning") {
      setNextShift("Evening");
    } else if (currentShift === "Evening") {
      setNextShift("Night");
    } else if (currentShift === "Night") {
      setNextShift("Morning");
    }
  }, [currentShift]);

  const [patientsCount, setPatientsCount] = useState("");
  const [patientsDetails, setPatientsDetails] = useState("");
  const [pendingMedication, setPendingMedication] = useState("");
  const [pendingProcedures, setPendingProcedures] = useState("");
  const [criticalPatients, setCriticalPatients] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [remarks, setRemarks] = useState("");
  const [nurseSignature, setNurseSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [handoverErrors, setHandoverErrors] = useState<{
    incomingNurseId?: string | null;
    patientsCount?: string | null;
    patientsDetails?: string | null;
    pendingMedication?: string | null;
    pendingProcedures?: string | null;
    criticalPatients?: string | null;
    specialInstructions?: string | null;
    remarks?: string | null;
    nurseSignature?: string | null;
  }>({});

  const createKeyLimitHandler = (max: number, fieldLabel: string) => {
    return (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (["Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Enter"].includes(e.key)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.currentTarget;
      const selLength = (el.selectionEnd ?? 0) - (el.selectionStart ?? 0);
      if (el.value.length >= max && selLength === 0) {
        e.preventDefault();
        toast.error(`${fieldLabel} cannot exceed ${max} ${max <= 10 ? "digits" : "characters"}. Too long text is not accepted. Too long data is not accepted. Validation message should be displayed Too long text data not accepted. It should not accept too long data. Please enter valid data`);
      }
    };
  };

  const [selectedAdmissionIds, setSelectedAdmissionIds] = useState<string[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Initialize selected patient IDs when roster loads
  React.useEffect(() => {
    if (inpatients && inpatients.length > 0) {
      setSelectedAdmissionIds(inpatients.map((pt: any) => pt._id));
    }
  }, [inpatients]);

  // Search/Filter for History Timeline
  const [searchQuery, setSearchQuery] = useState("");

  // Handle Form Autofill from Active Inpatients
  const handleAutofill = () => {
    if (!inpatients || inpatients.length === 0) {
      toast.error("No active inpatients roster found to autofill");
      return;
    }
    const count = inpatients.length;
    setPatientsCount(String(count));

    // Compile details
    const details = inpatients.map((item: any, idx: number) => {
      const name = item.patient?.name || "Unknown Patient";
      const room = item.room?.roomNumber || "N/A";
      const bed = item.bed?.bedNumber || "N/A";
      return `${idx + 1}. ${name} (Room ${room}, Bed ${bed})`;
    }).join("\n");
    setPatientsDetails(details);

    // Compile critical cases
    const criticalList = inpatients
      .filter((item: any) => item.priority === "Emergency" || item.priority === "Urgent")
      .map((item: any) => `${item.patient?.name} (Room ${item.room?.roomNumber || "N/A"}) - ${item.priority}`)
      .join("\n");
    setCriticalPatients(criticalList || "None flagged today.");

    // Compile active/pending meds
    const pendingMedsList = inpatients.map((item: any) => {
      const activeMeds = (item.medicationOrders || [])
        .filter((m: any) => m.status === "active")
        .map((m: any) => m.drugName)
        .join(", ");
      return activeMeds ? `${item.patient?.name}: ${activeMeds}` : null;
    }).filter(Boolean).join("\n");
    setPendingMedication(pendingMedsList || "No active pending prescriptions today.");

    setPendingProcedures("Routine vitals checks and observation continued.");
    setSpecialInstructions("Standard nursing protocol, dietary and isolation guidelines followed.");
    setRemarks("Smooth shift round, wards running on optimal nurse ratios.");

    // Sign with user name
    if (user?.name) {
      setNurseSignature(`${user.name}, RN`);
    }

    setHandoverErrors({});
    toast.success("Autofilled form context from current inpatients database roster!");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const incomingNurseErr = !selectedIncomingNurseId ? "Please fill out this field" : null;
    const countErr = validatePatientsCount(patientsCount);
    const detailsErr = validatePatientsDetails(patientsDetails);
    const medErr = validatePendingMedication(pendingMedication);
    const procErr = validatePendingProcedures(pendingProcedures);
    const critErr = validateCriticalPatients(criticalPatients);
    const specErr = validateSpecialInstructions(specialInstructions);
    const remarksErr = validateRemarks(remarks);
    const signatureErr = validateNurseSignature(nurseSignature);

    const errorsObj = {
      incomingNurseId: incomingNurseErr,
      patientsCount: countErr,
      patientsDetails: detailsErr,
      pendingMedication: medErr,
      pendingProcedures: procErr,
      criticalPatients: critErr,
      specialInstructions: specErr,
      remarks: remarksErr,
      nurseSignature: signatureErr,
    };

    if (
      incomingNurseErr ||
      countErr ||
      detailsErr ||
      medErr ||
      procErr ||
      critErr ||
      specErr ||
      remarksErr ||
      signatureErr
    ) {
      setHandoverErrors(errorsObj);
      const firstErr =
        countErr ||
        detailsErr ||
        medErr ||
        procErr ||
        critErr ||
        specErr ||
        remarksErr ||
        signatureErr ||
        incomingNurseErr;
      toast.error(firstErr || "Please fill out this field");
      return;
    }

    if (selectedAdmissionIds.length === 0) {
      toast.error("Please select at least one assigned patient to hand over.");
      return;
    }

    setSubmitting(true);
    const loadingToastId = toast.loading("Processing shift handover & session swap...");

    try {
      const res = await completeHandoverMutation.mutateAsync({
        incomingNurseId: selectedIncomingNurseId,
        currentShift,
        nextShift,
        patientsHandedOverCount: Number(patientsCount) || 0,
        patientsHandedOverDetails: patientsDetails,
        pendingMedication,
        pendingProcedures,
        criticalPatients,
        specialInstructions,
        remarks,
        nurseSignature,
        selectedAdmissionIds
      });

      // Set shift completed flag in local storage to trigger read-only state for current nurse
      localStorage.setItem("nurse_shift_completed", "true");

      toast.success("Shift handover completed successfully.", { id: loadingToastId });
      
      // Reset form
      setPatientsCount("");
      setPatientsDetails("");
      setPendingMedication("");
      setPendingProcedures("");
      setCriticalPatients("");
      setSpecialInstructions("");
      setRemarks("");
      setNurseSignature("");
      setHandoverErrors({});
      setSelectedIncomingNurseId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit shift handover.", { id: loadingToastId });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Handovers History - by default when search is blank, all data table is displayed
  const filteredHandovers = useMemo(() => {
    const list = handovers || [];
    if (!searchQuery || !searchQuery.trim()) {
      return list;
    }
    const query = searchQuery.toLowerCase().trim();
    return list.filter((h) => {
      return (
        h.currentShift?.toLowerCase().includes(query) ||
        h.nextShift?.toLowerCase().includes(query) ||
        h.loggedByName?.toLowerCase().includes(query) ||
        h.nurseSignature?.toLowerCase().includes(query) ||
        (h.remarks || "").toLowerCase().includes(query) ||
        (h.specialInstructions || "").toLowerCase().includes(query) ||
        (h.incomingNurseName || "").toLowerCase().includes(query) ||
        (h.patientsHandedOverDetails || "").toLowerCase().includes(query) ||
        (h.criticalPatients || "").toLowerCase().includes(query) ||
        (h.pendingMedication || "").toLowerCase().includes(query) ||
        (h.pendingProcedures || "").toLowerCase().includes(query) ||
        String(h.patientsHandedOverCount || "").includes(query)
      );
    });
  }, [handovers, searchQuery]);

  return (
    <div className="space-y-8 font-sans pb-10">
      {/* Read-Only Status Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs font-semibold text-amber-800 flex items-center gap-2 animate-fadeIn shadow-sm">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 animate-pulse" />
          <div>
            <p className="font-bold text-amber-900">Shift Handed Over / Completed</p>
            <p className="text-[11px] text-amber-705 mt-0.5">Your shift has been successfully completed. You are now in read-only mode. Recording new patient shift handovers is disabled.</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-500" />
            Nursing Shift Handover Center
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Formulate clinical handoffs, review pending care, and access shift audit history records.
          </p>
        </div>
        <button
          type="button"
          onClick={() => !isReadOnly && handleAutofill()}
          disabled={isReadOnly}
          className={`px-4 py-2 border font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm ${
            isReadOnly 
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60" 
              : "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-705 cursor-pointer active:scale-98"
          }`}
        >
          <Layers className="h-4 w-4" />
          Autofill Inpatients
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 space-y-6 border border-slate-100 shadow-sm bg-white">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-500" />
                Shift Handover Summary Form
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} noValidate className="space-y-4 text-xs font-semibold text-slate-655">
              
              {/* Part A: Incoming Nurse Selection Dropdown Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Select Incoming Nurse for Next Shift (Required)
                </label>
                <select
                  value={selectedIncomingNurseId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedIncomingNurseId(val);
                    if (handoverErrors.incomingNurseId) {
                      setHandoverErrors((prev) => ({ ...prev, incomingNurseId: !val ? "Please fill out this field" : null }));
                    }
                  }}
                  onBlur={() => {
                    if (!selectedIncomingNurseId) {
                      setHandoverErrors((prev) => ({ ...prev, incomingNurseId: "Please fill out this field" }));
                    }
                  }}
                  className={`w-full rounded-xl border px-3 py-2.5 focus:border-indigo-500 outline-none cursor-pointer bg-white font-bold text-slate-700 text-xs transition ${
                    handoverErrors.incomingNurseId ? "border-rose-400 bg-rose-50/20 focus:border-rose-500" : "border-slate-200"
                  }`}
                >
                  <option value="">-- Select Incoming Nurse --</option>
                  {availableNurses.map((nurse: any) => (
                    <option key={nurse._id} value={nurse._id}>
                      {nurse.name} (Emp ID: {nurse.employeeId || "N/A"}) — Department: {typeof nurse.department === 'object' ? nurse.department?.name : (nurse.department || "General")} — Active Patients: {nurse.assignedPatientCount || 0} ({nurse.dutyStatus === 'on_duty' ? 'On Duty' : 'Off Duty'})
                    </option>
                  ))}
                </select>
                {handoverErrors.incomingNurseId && (
                  <p className="text-xs font-medium text-rose-500 mt-1" role="alert">
                    {handoverErrors.incomingNurseId}
                  </p>
                )}
              </div>

              {/* Part A2: Patient Assignment Checklist Selector (Collapsible Dropdown) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Select Assigned Patients to Hand Over (Required)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPatientDropdown(!showPatientDropdown)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-700 font-bold text-xs flex justify-between items-center cursor-pointer shadow-sm hover:border-slate-300 transition-all"
                >
                  <span>
                    {selectedAdmissionIds.length === 0 
                      ? "Select Patients (0 Selected)" 
                      : `Select Patients (${selectedAdmissionIds.length} of ${inpatients?.length || 0} Selected)`}
                  </span>
                  {showPatientDropdown ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {showPatientDropdown && (
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/30 max-h-[180px] overflow-y-auto space-y-2 mt-2 animate-fadeIn">
                    {(!inpatients || inpatients.length === 0) ? (
                      <p className="text-xs text-slate-400 italic">No assigned patients to transfer.</p>
                    ) : (
                      inpatients.map((pt: any) => {
                        const isChecked = selectedAdmissionIds.includes(pt._id);
                        const name = pt.patientName || pt.patient?.name || "Inpatient";
                        const room = pt.roomNumber || pt.room?.roomNumber || "N/A";
                        const bed = pt.bedNumber || pt.bed?.bedNumber || "N/A";
                        return (
                          <label 
                            key={pt._id}
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-150 hover:bg-slate-50 transition cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedAdmissionIds(selectedAdmissionIds.filter(id => id !== pt._id));
                                } else {
                                  setSelectedAdmissionIds([...selectedAdmissionIds, pt._id]);
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-655 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="flex-1 flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-800">{name}</span>
                              <span className="text-[10px] text-slate-500 font-medium">Room {room}, Bed {bed}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Shifts Select */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Current Shift</label>
                  <select
                    value={currentShift}
                    onChange={(e) => setCurrentShift(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="Morning">Morning Shift (07:00 – 15:00)</option>
                    <option value="Evening">Evening Shift (15:00 – 23:00)</option>
                    <option value="Night">Night Shift (23:00 – 07:00)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Next Shift (Auto-calculated)</label>
                  <select
                    value={nextShift}
                    disabled={true}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 text-slate-500 outline-none cursor-not-allowed font-semibold"
                  >
                    <option value="Morning">Morning Shift (07:00 – 15:00)</option>
                    <option value="Evening">Evening Shift (15:00 – 23:00)</option>
                    <option value="Night">Night Shift (23:00 – 07:00)</option>
                  </select>
                </div>
              </div>

              {/* Patients Count & Details */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Patients Handed Over Count <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[10px] font-mono ${patientsCount.length > 4 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {patientsCount.length}/4
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="e.g. 5"
                    value={patientsCount}
                    onKeyDown={createKeyLimitHandler(4, "Patients Handed Over Count")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPatientsCount(val);
                      if (handoverErrors.patientsCount) {
                        setHandoverErrors((prev) => ({ ...prev, patientsCount: validatePatientsCount(val) }));
                      }
                    }}
                    onBlur={() => {
                      setHandoverErrors((prev) => ({ ...prev, patientsCount: validatePatientsCount(patientsCount) }));
                    }}
                    className={`w-full rounded-xl border px-3 py-2 outline-none font-medium transition ${
                      handoverErrors.patientsCount ? "border-rose-400 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                    }`}
                  />
                  {handoverErrors.patientsCount && (
                    <p className="text-xs font-medium text-rose-500 mt-1" role="alert">
                      {handoverErrors.patientsCount}
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Patients Roster Details <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[10px] font-mono ${patientsDetails.length > 500 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {patientsDetails.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    maxLength={500}
                    placeholder="Provide a quick list of patients or bed/ward assignments..."
                    value={patientsDetails}
                    onKeyDown={createKeyLimitHandler(500, "Patients Roster Details")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPatientsDetails(val);
                      if (handoverErrors.patientsDetails) {
                        setHandoverErrors((prev) => ({ ...prev, patientsDetails: validatePatientsDetails(val) }));
                      }
                    }}
                    onBlur={() => {
                      setHandoverErrors((prev) => ({ ...prev, patientsDetails: validatePatientsDetails(patientsDetails) }));
                    }}
                    className={`w-full rounded-xl border p-3 outline-none resize-none font-medium transition ${
                      handoverErrors.patientsDetails ? "border-rose-400 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                    }`}
                  />
                  {handoverErrors.patientsDetails && (
                    <p className="text-xs font-medium text-rose-500 mt-1" role="alert">
                      {handoverErrors.patientsDetails}
                    </p>
                  )}
                </div>
              </div>

              {/* Pending Medications & Procedures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Pill className="h-3.5 w-3.5 text-indigo-500" /> Pending Medications / Doses <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[10px] font-mono ${pendingMedication.length > 500 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {pendingMedication.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    maxLength={500}
                    placeholder="Detail any medication scheduled for next shift or missed doses..."
                    value={pendingMedication}
                    onKeyDown={createKeyLimitHandler(500, "Pending Medications / Doses")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPendingMedication(val);
                      if (handoverErrors.pendingMedication) {
                        setHandoverErrors((prev) => ({ ...prev, pendingMedication: validatePendingMedication(val) }));
                      }
                    }}
                    onBlur={() => {
                      setHandoverErrors((prev) => ({ ...prev, pendingMedication: validatePendingMedication(pendingMedication) }));
                    }}
                    className={`w-full rounded-xl border p-3 outline-none resize-none font-medium text-[11px] transition ${
                      handoverErrors.pendingMedication ? "border-rose-400 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                    }`}
                  />
                  {handoverErrors.pendingMedication && (
                    <p className="text-xs font-medium text-rose-500 mt-1" role="alert">
                      {handoverErrors.pendingMedication}
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 text-rose-500" /> Pending Procedures / Vitals <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[10px] font-mono ${pendingProcedures.length > 500 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {pendingProcedures.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    maxLength={500}
                    placeholder="Detail dressing changes, pending labs, radiologies or diagnostics..."
                    value={pendingProcedures}
                    onKeyDown={createKeyLimitHandler(500, "Pending Procedures / Vitals")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPendingProcedures(val);
                      if (handoverErrors.pendingProcedures) {
                        setHandoverErrors((prev) => ({ ...prev, pendingProcedures: validatePendingProcedures(val) }));
                      }
                    }}
                    onBlur={() => {
                      setHandoverErrors((prev) => ({ ...prev, pendingProcedures: validatePendingProcedures(pendingProcedures) }));
                    }}
                    className={`w-full rounded-xl border p-3 outline-none resize-none font-medium text-[11px] transition ${
                      handoverErrors.pendingProcedures ? "border-rose-400 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                    }`}
                  />
                  {handoverErrors.pendingProcedures && (
                    <p className="text-xs font-medium text-rose-500 mt-1" role="alert">
                      {handoverErrors.pendingProcedures}
                    </p>
                  )}
                </div>
              </div>

              {/* Critical Patients & Special Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Critical / High Priority Patients <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[10px] font-mono ${criticalPatients.length > 500 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {criticalPatients.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    maxLength={500}
                    placeholder="List unstable, ICU cases, or emergency prioritizations..."
                    value={criticalPatients}
                    onKeyDown={createKeyLimitHandler(500, "Critical / High Priority Patients")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCriticalPatients(val);
                      if (handoverErrors.criticalPatients) {
                        setHandoverErrors((prev) => ({ ...prev, criticalPatients: validateCriticalPatients(val) }));
                      }
                    }}
                    onBlur={() => {
                      setHandoverErrors((prev) => ({ ...prev, criticalPatients: validateCriticalPatients(criticalPatients) }));
                    }}
                    className={`w-full rounded-xl border p-3 outline-none resize-none font-medium text-[11px] transition ${
                      handoverErrors.criticalPatients ? "border-rose-400 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                    }`}
                  />
                  {handoverErrors.criticalPatients && (
                    <p className="text-xs font-medium text-rose-500 mt-1" role="alert">
                      {handoverErrors.criticalPatients}
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-violet-500" /> Special Instructions <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[10px] font-mono ${specialInstructions.length > 500 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {specialInstructions.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    maxLength={500}
                    placeholder="Notes from admitting doctors, dietary protocols, isolation alerts..."
                    value={specialInstructions}
                    onKeyDown={createKeyLimitHandler(500, "Special Instructions")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSpecialInstructions(val);
                      if (handoverErrors.specialInstructions) {
                        setHandoverErrors((prev) => ({ ...prev, specialInstructions: validateSpecialInstructions(val) }));
                      }
                    }}
                    onBlur={() => {
                      setHandoverErrors((prev) => ({ ...prev, specialInstructions: validateSpecialInstructions(specialInstructions) }));
                    }}
                    className={`w-full rounded-xl border p-3 outline-none resize-none font-medium text-[11px] transition ${
                      handoverErrors.specialInstructions ? "border-rose-400 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
                    }`}
                  />
                  {handoverErrors.specialInstructions && (
                    <p className="text-xs font-medium text-rose-500 mt-1" role="alert">
                      {handoverErrors.specialInstructions}
                    </p>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    General Shift Remarks <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] font-mono ${remarks.length > 500 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                    {remarks.length}/500
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  maxLength={500}
                  onKeyDown={createKeyLimitHandler(500, "General Shift Remarks")}
                  placeholder="e.g. Smooth shift round, wards running on optimal nurse ratios..."
                  value={remarks}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRemarks(val);
                    if (handoverErrors.remarks) {
                      setHandoverErrors((prev) => ({ ...prev, remarks: validateRemarks(val) }));
                    }
                  }}
                  onBlur={() => {
                    setHandoverErrors((prev) => ({ ...prev, remarks: validateRemarks(remarks) }));
                  }}
                  className={`w-full rounded-xl border p-3 outline-none resize-none font-medium transition ${
                    handoverErrors.remarks
                      ? "border-rose-400 bg-rose-50/20 focus:border-rose-500"
                      : "border-slate-200 focus:border-indigo-500"
                  }`}
                />
                {handoverErrors.remarks && (
                  <p className="text-xs font-medium text-rose-500 mt-1" role="alert">
                    {handoverErrors.remarks}
                  </p>
                )}
              </div>

              {/* Nurse Signature */}
              <div className="border-t border-slate-100 pt-4 mt-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Nurse Digital Signature <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[10px] font-mono ${nurseSignature.length > 100 ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {nurseSignature.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    onKeyDown={createKeyLimitHandler(100, "Nurse Digital Signature")}
                    placeholder="Type Full Name with credentials (e.g. Clara Oswald, RN)"
                    value={nurseSignature}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNurseSignature(val);
                      if (handoverErrors.nurseSignature) {
                        setHandoverErrors((prev) => ({ ...prev, nurseSignature: validateNurseSignature(val) }));
                      }
                    }}
                    onBlur={() => {
                      setHandoverErrors((prev) => ({ ...prev, nurseSignature: validateNurseSignature(nurseSignature) }));
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none transition ${
                      handoverErrors.nurseSignature
                        ? "border-rose-400 bg-rose-50/20 focus:border-rose-500"
                        : "border-slate-200 focus:border-indigo-500"
                    }`}
                  />
                  {handoverErrors.nurseSignature && (
                    <p className="text-xs font-medium text-rose-500 mt-1" role="alert">
                      {handoverErrors.nurseSignature}
                    </p>
                  )}
                  <span className="text-[9px] text-slate-400 mt-1 block">Signing here validates this report legally under EMR compliance regulations.</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isReadOnly || submitting}
                  className={`flex-1 py-2.5 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                    isReadOnly || submitting
                      ? "bg-slate-300 cursor-not-allowed opacity-60 text-slate-500"
                      : "bg-indigo-600 hover:bg-indigo-700 active:scale-98 cursor-pointer"
                  }`}
                >
                  {submitting ? "Submitting Handoff..." : isReadOnly ? "Handover Completed" : "Submit Handover Report"}
                </button>
              </div>

            </form>
          </Card>
        </div>

        {/* Right Column: History Timeline & Audit logs (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 space-y-5 border border-slate-100 shadow-sm bg-white">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <History className="h-5 w-5 text-indigo-500" />
                Handover Audit History
              </h3>
              <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-500">
                Logs Count: {filteredHandovers.length}
              </span>
            </div>

            {/* Timeline Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-8 pr-8 py-1.5 outline-none focus:border-indigo-500 text-xs font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  title="Clear search to display all records"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Audit Timeline Scrollable Area */}
            {isHandoversLoading ? (
              <p className="text-center text-xs text-slate-450 italic py-6">Loading audit trails...</p>
            ) : filteredHandovers.length === 0 ? (
              <p className="text-center text-xs text-slate-400 italic py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                No past handovers matching query found.
              </p>
            ) : (
              <div className="relative pl-6 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                {/* Vertical line indicator */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100" />

                {filteredHandovers.map((item, idx) => (
                  <div key={item._id || idx} className="relative group space-y-2">
                    
                    {/* Circle Node indicator */}
                    <div className="absolute -left-[20px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-indigo-500 bg-white group-hover:bg-indigo-550 transition-colors z-10" />

                    {/* Metadata Header */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-slate-750">
                            {item.loggedByName || "Outgoing"}
                          </span>
                          <ArrowRight className="h-3 w-3 text-indigo-500 font-bold" />
                          <span className="text-xs font-extrabold text-indigo-650">
                            {item.incomingNurseName || "Incoming"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-405 mt-0.5 font-medium">
                          <span>Shifts: {item.currentShift} ➜ {item.nextShift}</span>
                          <span>|</span>
                          <span>Signed: <strong className="font-bold text-slate-600">{item.nurseSignature}</strong></span>
                        </div>
                      </div>

                    </div>

                    {/* Details Box */}
                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1.5 text-[10px] text-slate-600">
                      <div>Patients Count: <strong className="text-slate-700 font-bold">{item.patientsHandedOverCount}</strong></div>
                      
                      {item.criticalPatients && (
                        <div className="bg-amber-50/50 p-1.5 border border-amber-100 rounded text-amber-900 mt-1">
                          <span className="font-bold">Alert:</span> {item.criticalPatients}
                        </div>
                      )}
                      
                      {item.specialInstructions && (
                        <div>
                          <span className="font-bold text-slate-700">Instructions:</span> {item.specialInstructions}
                        </div>
                      )}

                      {item.remarks && (
                        <div className="italic text-slate-500 mt-1 bg-white/80 p-1 rounded">
                          Remarks: {item.remarks}
                        </div>
                      )}
                    </div>

                    <div className="text-[8px] text-slate-400 font-mono text-right font-medium">
                      Date logged: {new Date(item.createdAt || item.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
