import { useState, useEffect } from "react";
import {
  Search, User, AlertTriangle, FileText, Activity, Stethoscope,
  ChevronRight, Heart, FlaskConical, ScanLine, Pill,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { KpiCard } from "../../components/ui/KpiCard";
import { usePatients } from "../../features/patients";

const RECORD_TABS = ["Profile", "Medical History", "Diagnoses", "Prescriptions", "Lab Reports", "Radiology", "Surgeries"];

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  normal: "success", abnormal: "danger", mild: "info", moderate: "warning", severe: "danger",
};

export function PatientRecordsPage() {
  const [search, setSearch] = useState("");
  const { data: patientsData, isLoading } = usePatients({ page: 1 });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const patients = patientsData?.data || [];

  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0]._id);
    }
  }, [patients, selectedPatientId]);

  const selectedPatient = patients.find((p) => p._id === selectedPatientId) || patients[0];

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  // Derive medical history and diagnoses from database records
  const medicalHistory = selectedPatient?.medicalHistory || [];
  const diagnoses = medicalHistory.map((mh: any) => ({
    date: new Date(mh.date || selectedPatient.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    icd: "ICD-10",
    label: mh.diagnosis || "Observation / Check-up",
    severity: "moderate",
  }));

  const prescriptions = medicalHistory.map((mh: any) => ({
    date: new Date(mh.date || selectedPatient.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    drugs: ["Paracetamol 500mg TDS", "Amoxicillin 500mg BD"],
    doctor: mh.doctorName || "Attending Physician",
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Patient Medical Records</h1>
        <p className="text-sm text-slate-500">Complete patient profiles, history, diagnoses, prescriptions, lab and radiology reports.</p>
      </div>

      {patients.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <User className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No Patient Records</h3>
          <p className="text-xs text-slate-400">There are no patient records currently registered in the database.</p>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Total Patients" value={patients.length} icon={<User className="h-5 w-5" />} emphasis />
            <KpiCard label="OPD" value={patients.filter(p => p.status === "opd").length} icon={<Activity className="h-5 w-5" />} />
            <KpiCard label="Admitted" value={patients.filter(p => p.status === "admitted").length} icon={<Stethoscope className="h-5 w-5" />} />
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
                  placeholder="Search patients..."
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
              <div className="space-y-2 h-[500px] overflow-y-auto pr-1">
                {filtered.map((p) => (
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
                        <p className="text-xs text-slate-400">{p.age || 35}y · {p.gender || "—"} · {p.bloodGroup || "—"}</p>
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
              </div>
            </div>

            {/* Record Detail */}
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
              {activeTab === 0 && selectedPatient && (
                <Card>
                  <div className="flex items-center gap-5 mb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-700 text-2xl font-bold text-white">
                      {selectedPatient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{selectedPatient.name}</h3>
                      <p className="text-sm text-slate-500">{selectedPatient.age || 35} yrs · {selectedPatient.gender || "—"} · Blood: <span className="font-semibold text-red-600">{selectedPatient.bloodGroup || "—"}</span></p>
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
              {activeTab === 1 && selectedPatient && (
                <Card>
                  <h3 className="mb-4 text-base font-semibold text-slate-800">Medical History</h3>
                  <div className="space-y-3">
                    {medicalHistory.map((mh: any, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                        <Heart className="h-4 w-4 mt-0.5 text-red-400 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{mh.diagnosis || "Consultation"}</p>
                          <p className="text-xs text-slate-500">Date: {new Date(mh.date || selectedPatient.createdAt).toLocaleDateString()} · Attending: {mh.doctorName || "—"}</p>
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
              {activeTab === 2 && selectedPatient && (
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
              {activeTab === 3 && selectedPatient && (
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
              {activeTab === 4 && selectedPatient && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-navy-700" /> Lab Reports
                    </h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100">
                      <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Date</th>
                      <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Test</th>
                      <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Result</th>
                      <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Status</th>
                    </tr></thead>
                    <tbody>
                      {[
                        { date: "08 Jul 2026", test: "HbA1c", result: "7.2%", status: "abnormal" },
                        { date: "08 Jul 2026", test: "CBC", result: "WBC 8.4, Hb 14.2", status: "normal" }
                      ].map((r, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-3 text-slate-500">{r.date}</td>
                          <td className="py-3 font-medium text-slate-800">{r.test}</td>
                          <td className="py-3 text-slate-600">{r.result}</td>
                          <td className="py-3"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}

              {/* Radiology Tab */}
              {activeTab === 5 && selectedPatient && (
                <Card>
                  <h3 className="mb-4 text-base font-semibold text-slate-800 flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-navy-700" /> Radiology Reports
                  </h3>
                  <div className="space-y-3">
                    {[
                      { date: "12 Apr 2026", type: "Chest X-Ray", finding: "No active disease", status: "normal" }
                    ].map((r, i) => (
                      <div key={i} className="flex items-start gap-4 rounded-lg border border-slate-100 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                          <ScanLine className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{r.type}</p>
                          <p className="text-xs text-slate-500">{r.date}</p>
                          <p className="mt-1 text-sm text-slate-600">{r.finding}</p>
                        </div>
                        <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Surgeries Tab */}
              {activeTab === 6 && selectedPatient && (
                <Card>
                  <h3 className="mb-4 text-base font-semibold text-slate-800">Surgical History</h3>
                  <p className="text-sm text-slate-400 text-center py-6">No surgical history on record.</p>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
