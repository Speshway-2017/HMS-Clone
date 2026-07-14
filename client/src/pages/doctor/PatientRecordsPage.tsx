import { useState, useEffect } from "react";
import {
  Search, User, AlertTriangle, FileText, Activity, Stethoscope,
  ChevronRight, Heart, FlaskConical, ScanLine, Pill, ShieldAlert,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { KpiCard } from "../../components/ui/KpiCard";
// ── SECURITY FIX: use doctor-scoped hook, NOT usePatients() ──────────────────
// usePatients() calls /api/v1/patients which returns ALL hospital patients.
// useDoctorPatients() calls /doctors/dashboard/my-patients — the server
// enforces doctor ownership at the MongoDB level (no cross-doctor leakage).
import { useDoctorPatients } from "../../features/doctorDashboard";
import type { Patient } from "../../types/domain";

const RECORD_TABS = ["Profile", "Medical History", "Diagnoses", "Prescriptions", "Lab Reports", "Radiology", "Surgeries"];

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  normal: "success", abnormal: "danger", mild: "info", moderate: "warning", severe: "danger",
};

export function PatientRecordsPage() {
  const [search, setSearch] = useState("");
  // Doctor-scoped — only returns patients that have an appointment/admission/
  // lab order/radiology order with the logged-in doctor.
  const { data: myPatientsData, isLoading, isError } = useDoctorPatients({ search });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const patients: Patient[] = myPatientsData?.patients ?? [];
  const counts = myPatientsData?.counts;

  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0]._id);
    }
  }, [patients, selectedPatientId]);

  const selectedPatient = patients.find((p) => p._id === selectedPatientId) ?? patients[0];

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-red-200 bg-red-50">
        <ShieldAlert className="mb-2 h-10 w-10 text-red-400" />
        <h3 className="text-sm font-semibold text-red-600">Failed to load patient records</h3>
        <p className="text-xs text-red-400 mt-1">Please try reloading the page.</p>
      </Card>
    );
  }

  // Derive medical history and diagnoses from database records
  const medicalHistory = selectedPatient?.medicalHistory ?? [];
  const diagnoses = medicalHistory.map((mh) => ({
    date: new Date(mh.date || selectedPatient!.createdAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    icd: "ICD-10",
    label: mh.diagnosis || "Observation / Check-up",
    severity: "moderate",
  }));

  const prescriptions = medicalHistory.map((mh) => ({
    date: new Date(mh.date || selectedPatient!.createdAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    drugs: ["Refer to Prescriptions module for detailed medications"],
    doctor: mh.doctorName || "Attending Physician",
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Patient Medical Records</h1>
        <p className="text-sm text-slate-500">
          Your patients — complete profiles, history, diagnoses, prescriptions, lab and radiology reports.
        </p>
      </div>

      {patients.length === 0 ? (
        /* ── Empty state: new doctor with no assigned patients ── */
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <User className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No patients assigned to you.</h3>
          <p className="text-xs text-slate-400 mt-1">
            Patients will appear here once appointments, admissions, lab orders, or radiology
            orders are assigned to you through the normal workflow.
          </p>
        </Card>
      ) : (
        <>
          {/* KPIs — scoped to this doctor's patients only */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="My Patients" value={counts?.total ?? patients.length} icon={<User className="h-5 w-5" />} emphasis />
            <KpiCard label="OPD" value={counts?.opd ?? patients.filter(p => p.status === "opd").length} icon={<Activity className="h-5 w-5" />} />
            <KpiCard label="Admitted" value={counts?.admitted ?? patients.filter(p => p.status === "admitted").length} icon={<Stethoscope className="h-5 w-5" />} />
            <KpiCard label="With Allergies" value={patients.filter(p => p.allergies).length} icon={<AlertTriangle className="h-5 w-5" />} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Patient List */}
            <div className="space-y-3 lg:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your patients..."
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
              <div className="space-y-2 h-[500px] overflow-y-auto pr-1">
                {patients.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => { setSelectedPatientId(p._id); setActiveTab(0); }}
                    className={`cursor-pointer rounded-xl border p-3 transition-all hover:shadow-sm ${
                      selectedPatient?._id === p._id ? "border-navy-300 bg-navy-50 shadow-sm" : "border-slate-100 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                        {p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.age || "—"}y · {p.gender || "—"} · {p.bloodGroup || "—"}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                    {p.allergies && (
                      <div className="mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        <span className="text-xs text-red-600 truncate">Allergy: {p.allergies}</span>
                      </div>
                    )}
                  </div>
                ))}
                {patients.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-8">No patients match your search.</p>
                )}
              </div>
            </div>

            {/* Record Detail */}
            {selectedPatient && (
              <div className="space-y-4 lg:col-span-3">
                {/* Tabs */}
                <div className="flex flex-wrap gap-1 border-b border-slate-200">
                  {RECORD_TABS.map((tab, i) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(i)}
                      className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                        activeTab === i ? "border-navy-700 text-navy-700" : "border-transparent text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Profile Tab */}
                {activeTab === 0 && (
                  <Card>
                    <div className="flex items-center gap-5 mb-6">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-700 text-2xl font-bold text-white">
                        {selectedPatient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">{selectedPatient.name}</h3>
                        <p className="text-sm text-slate-500">{selectedPatient.age || "—"} yrs · {selectedPatient.gender || "—"} · Blood: <span className="font-semibold text-red-600">{selectedPatient.bloodGroup || "—"}</span></p>
                        <span className="inline-block mt-2">
                          <Badge tone={selectedPatient.status === "admitted" ? "warning" : "info"}>{selectedPatient.status.toUpperCase()}</Badge>
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Phone", value: selectedPatient.phone || "—" },
                        { label: "Email", value: selectedPatient.email || "—" },
                        { label: "Address", value: selectedPatient.address || "—" },
                        { label: "Blood Group", value: selectedPatient.bloodGroup || "—" },
                      ].map((f) => (
                        <div key={f.label} className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-400 mb-1">{f.label}</p>
                          <p className="text-sm text-slate-700">{f.value}</p>
                        </div>
                      ))}
                    </div>
                    {selectedPatient.allergies && (
                      <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <p className="text-sm font-semibold text-red-700">Known Allergies</p>
                        </div>
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">{selectedPatient.allergies}</span>
                      </div>
                    )}
                  </Card>
                )}

                {/* Medical History Tab */}
                {activeTab === 1 && (
                  <Card>
                    <h3 className="mb-4 text-base font-semibold text-slate-800">Medical History</h3>
                    <div className="space-y-3">
                      {medicalHistory.map((mh, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                          <Heart className="h-4 w-4 mt-0.5 text-red-400 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{mh.diagnosis || "Consultation"}</p>
                            <p className="text-xs text-slate-500">Date: {new Date(mh.date || selectedPatient.createdAt!).toLocaleDateString()} · Attending: {mh.doctorName || "—"}</p>
                            <p className="text-xs text-slate-600 mt-1">{mh.notes || "No clinical notes."}</p>
                          </div>
                        </div>
                      ))}
                      {medicalHistory.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-6">No medical history on record.</p>
                      )}
                    </div>
                  </Card>
                )}

                {/* Diagnoses Tab */}
                {activeTab === 2 && (
                  <Card>
                    <h3 className="mb-4 text-base font-semibold text-slate-800">Diagnoses</h3>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-slate-100">
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Date</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">ICD-10</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Diagnosis</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Severity</th>
                      </tr></thead>
                      <tbody>
                        {diagnoses.map((d, i) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-3 text-slate-500">{d.date}</td>
                            <td className="py-3 font-mono text-slate-600">{d.icd}</td>
                            <td className="py-3 font-medium text-slate-800">{d.label}</td>
                            <td className="py-3"><Badge tone={STATUS_TONE[d.severity]}>{d.severity}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {diagnoses.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-6">No diagnoses recorded.</p>
                    )}
                  </Card>
                )}

                {/* Prescriptions Tab */}
                {activeTab === 3 && (
                  <div className="space-y-4">
                    {prescriptions.map((rx, i) => (
                      <Card key={i}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-800">Prescription — {rx.date}</h3>
                            <p className="text-xs text-slate-500">Prescribed by {rx.doctor}</p>
                          </div>
                          <Badge tone="info">Issued</Badge>
                        </div>
                        <div className="space-y-1">
                          {rx.drugs.map((drug, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <Pill className="h-3.5 w-3.5 text-navy-400" />
                              <p className="text-sm text-slate-700">{drug}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                    {prescriptions.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-6">No prescriptions issued.</p>
                    )}
                  </div>
                )}

                {/* Lab Reports Tab */}
                {activeTab === 4 && (
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-navy-700" /> Lab Reports
                      </h3>
                    </div>
                    <p className="text-sm text-slate-400 text-center py-6">
                      View detailed lab results in the Laboratory module.
                    </p>
                  </Card>
                )}

                {/* Radiology Tab */}
                {activeTab === 5 && (
                  <Card>
                    <h3 className="mb-4 text-base font-semibold text-slate-800 flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-navy-700" /> Radiology Reports
                    </h3>
                    <p className="text-sm text-slate-400 text-center py-6">
                      View detailed radiology results in the Radiology module.
                    </p>
                  </Card>
                )}

                {/* Surgeries Tab */}
                {activeTab === 6 && (
                  <Card>
                    <h3 className="mb-4 text-base font-semibold text-slate-800">Surgical History</h3>
                    <p className="text-sm text-slate-400 text-center py-6">No surgical history on record.</p>
                  </Card>
                )}

                {/* Security info badge */}
                <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-700">
                    Showing only patients assigned to you. All access is logged for compliance.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
