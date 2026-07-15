import { useState, useEffect } from "react";
import {
  BedDouble, User, Clock, FileText, Pill, AlertTriangle,
  ChevronRight, CheckCircle2, ClipboardList, HeartPulse, Thermometer, LogOut, Loader2
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { KpiCard } from "../../components/ui/KpiCard";
import { usePatients } from "../../features/patients";
import { api } from "../../lib/api";
import toast from "react-hot-toast";

const STATUS_BADGE: Record<string, { tone: "danger" | "warning" | "success" | "info" | "neutral"; label: string }> = {
  critical: { tone: "danger",  label: "Critical" },
  moderate: { tone: "warning", label: "Moderate" },
  stable:   { tone: "success", label: "Stable"   },
};

const TABS = ["Admitted Patients", "Daily Notes", "Treatment Plan", "Discharge"];

export function IPManagementPage() {
  const [activeTab, setActiveTab] = useState(0);
  const { data: patientsData, isLoading } = usePatients({ status: "admitted" });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [progressNote, setProgressNote] = useState("");

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
      setProgressNote(patients[0].medicalHistory?.[0]?.notes || "Admitted. Patient stable. Watching vitals.");
    }
  }, [patients, selectedPatientId]);

  const selectedPatient = patients.find((p) => p._id === selectedPatientId) || patients[0];

  const handleSelect = (p: any) => {
    setSelectedPatientId(p._id);
    setProgressNote(p.medicalHistory?.[0]?.notes || "Admitted. Patient stable. Watching vitals.");
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
    if (!form?.diagnosis) {
      toast.error("Please fill in the diagnosis at discharge");
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

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  // Map database patient fields to format needed by the UI
  const formatAttending = (p: any) => {
    return typeof p.assignedDoctor === "object" && p.assignedDoctor ? p.assignedDoctor.name : "Dr. Montgomery";
  };

  const getDaysAdmitted = (p: any) => {
    const created = new Date(p.createdAt);
    const diff = Math.floor((new Date().getTime() - created.getTime()) / (1000 * 3600 * 24));
    return Math.max(1, diff);
  };

  const getPatientDiagnosis = (p: any) => {
    return p?.medicalHistory?.[0]?.diagnosis || "Observation / Check-up";
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
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        {TABS.map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActiveTab(idx)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
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
                        <p className="text-xs text-slate-400">Bed: C-{p.age || "—"} · Day {getDaysAdmitted(p)}</p>
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
                      <Badge tone={selectedPatient.allergies?.toLowerCase().includes("penicillin") ? "danger" : "success"}>Attending: {formatAttending(selectedPatient)}</Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      {selectedPatient.age} yrs · {selectedPatient.gender} · Blood Group: {selectedPatient.bloodGroup || "—"} · Bed C-{selectedPatient.age || "—"}
                    </p>
                  </div>
                </Card>

                {/* Vitals Summary */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "Blood Pressure", value: "120/80 mmHg", icon: <HeartPulse className="h-4 w-4 text-rose-500" /> },
                    { label: "Pulse / HR", value: "76 bpm", icon: <HeartPulse className="h-4 w-4 text-emerald-500" /> },
                    { label: "Temperature", value: "98.6°F", icon: <Thermometer className="h-4 w-4 text-amber-500" /> },
                    { label: "SpO₂ Status", value: "98%", icon: <Thermometer className="h-4 w-4 text-blue-500" /> },
                  ].map((vital) => (
                    <Card key={vital.label} className="p-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        {vital.icon} {vital.label}
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{vital.value}</p>
                    </Card>
                  ))}
                </div>

                {/* Progress Note */}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-navy-700" /> Daily Progress Note
                    </h3>
                    <span className="text-xs text-slate-400">Day {getDaysAdmitted(selectedPatient)} Note</span>
                  </div>
                  <textarea
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                  />
                  <div className="mt-3 flex gap-2">
                    <Button variant="primary"><CheckCircle2 className="h-4 w-4" /> Save Note</Button>
                    <Button variant="secondary">Order Lab Test</Button>
                  </div>
                </Card>

                {/* Medications */}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Pill className="h-4 w-4 text-navy-700" /> Medication Orders
                    </h3>
                    <button className="text-xs font-medium text-navy-700 hover:underline">+ Add Drug</button>
                  </div>
                  {["Paracetamol 500mg TDS", "Amoxicillin 500mg BD"].map((med, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 mb-1.5 hover:bg-slate-50">
                      <span className="text-sm text-slate-700">• {med}</span>
                      <div className="flex gap-2">
                        <button className="text-xs text-amber-600 hover:underline">Modify</button>
                        <button className="text-xs text-red-500 hover:underline">Stop</button>
                      </div>
                    </div>
                  ))}
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
                {patients.map((p) => {
                  const isCritical = p.allergies?.toLowerCase().includes("penicillin");
                  const pStatus = isCritical ? "critical" : p.age && p.age > 60 ? "moderate" : "stable";

                  return (
                    <div key={p._id} className="rounded-xl border border-slate-100 p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                          {p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{p.name} <span className="text-slate-400 font-normal">· Bed C-{p.age || "—"} · Day {getDaysAdmitted(p)}</span></p>
                          <p className="text-xs text-slate-500">{getPatientDiagnosis(p)}</p>
                        </div>
                        <span className="ml-auto">
                          <Badge tone={STATUS_BADGE[pStatus].tone} >{STATUS_BADGE[pStatus].label}</Badge>
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 rounded-lg bg-slate-50 px-3 py-2">{p.medicalHistory?.[0]?.notes || "Admitted. Vital monitoring stable."}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Treatment Plan Tab */}
          {activeTab === 2 && (
            <div className="space-y-4">
              {patients.map((p) => {
                const isCritical = p.allergies?.toLowerCase().includes("penicillin");
                const pStatus = isCritical ? "critical" : p.age && p.age > 60 ? "moderate" : "stable";

                return (
                  <Card key={p._id}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">{p.name} — Treatment Plan</h3>
                        <p className="text-xs text-slate-500">{getPatientDiagnosis(p)} · Attending: {formatAttending(p)}</p>
                      </div>
                      <Badge tone={STATUS_BADGE[pStatus].tone}>{STATUS_BADGE[pStatus].label}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Medications</p>
                        <p className="text-xs text-slate-600">• Paracetamol 500mg TDS</p>
                        <p className="text-xs text-slate-600">• Amoxicillin 500mg BD</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Vitals Goal</p>
                        <p className="text-xs text-slate-600">• BP &lt; 130/80</p>
                        <p className="text-xs text-slate-600">• SpO₂ &gt; 95%</p>
                        <p className="text-xs text-slate-600">• HR 60–100 bpm</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Plan</p>
                        <p className="text-xs text-slate-600">• Daily rounds</p>
                        <p className="text-xs text-slate-600">• Labs every 48h</p>
                        <p className="text-xs text-slate-600">• Discharge review in {Math.max(1, 7 - getDaysAdmitted(p))} days</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Discharge Tab */}
          {activeTab === 3 && (
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
                        <p className="text-xs text-slate-500">Admitted {getDaysAdmitted(p)} days ago · Bed C-{p.age || "—"}</p>
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
                          <div className="grid grid-cols-2 gap-4">
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
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Diagnosis at Discharge <span className="text-red-500">*</span></label>
                                <input
                                  type="text"
                                  value={getDischargeField(p._id, "diagnosis")}
                                  onChange={e => setDischargeField(p._id, "diagnosis", e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                                  placeholder="e.g. Acute Viral Fever, Resolved"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Discharge Medications</label>
                                <textarea
                                  value={getDischargeField(p._id, "medications")}
                                  onChange={e => setDischargeField(p._id, "medications", e.target.value)}
                                  rows={3}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                                  placeholder="List medications to continue after discharge..."
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Follow-up Instructions</label>
                                <input
                                  type="text"
                                  value={getDischargeField(p._id, "followUp")}
                                  onChange={e => setDischargeField(p._id, "followUp", e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                                  placeholder="e.g. OPD after 2 weeks"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Special Instructions</label>
                                <input
                                  type="text"
                                  value={getDischargeField(p._id, "specialInstructions")}
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
    </div>
  );
}
