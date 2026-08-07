import { useState, useEffect } from "react";
import {
  Search, User, AlertTriangle, FileText, Activity, Stethoscope,
  ChevronRight, Heart, FlaskConical, ScanLine, Pill, Download, Eye,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { KpiCard } from "../../components/ui/KpiCard";
import { Modal } from "../../components/ui/Modal";
// ── SECURITY FIX: use doctor-scoped hook, NOT usePatients() ──────────────────
// usePatients() calls /api/v1/patients which returns ALL hospital patients.
// useDoctorPatients() calls /doctors/dashboard/my-patients — the server
// enforces doctor ownership at the MongoDB level (no cross-doctor leakage).
import { useDoctorPatients, usePrescriptions } from "../../features/doctorDashboard";
import { usePatientReports } from "../../features/laboratory";
import type { Patient } from "../../types/domain";
import { usePatients } from "../../features/patients";

const RECORD_TABS = ["Profile", "Medical History", "Diagnoses", "Prescriptions", "Lab Reports", "Radiology", "Surgeries"];

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  normal: "success", abnormal: "danger", mild: "info", moderate: "warning", severe: "danger",
};

interface ConsultationGroup {
  id: string;
  date: Date;
  dateFormatted: string;
  appointmentRef?: string;
  chiefComplaint?: string;
  doctorName?: string;
  reports: any[];
}

function groupReportsByConsultation(reportsList: any[]): ConsultationGroup[] {
  if (!reportsList || reportsList.length === 0) return [];

  const map = new Map<string, ConsultationGroup>();

  reportsList.forEach((r) => {
    let key = "";
    let dateObj: Date;
    let ref: string | undefined;
    let complaint: string | undefined;
    let docName: string | undefined;

    if (r.appointment && typeof r.appointment === "object" && (r.appointment._id || r.appointment.referenceId)) {
      key = r.appointment._id ? r.appointment._id.toString() : r.appointment.referenceId;
      dateObj = new Date(r.appointment.date || r.uploadedAt || r.createdAt);
      ref = r.appointment.referenceId;
      complaint = r.appointment.chiefComplaint || r.appointment.diagnosis;
      docName = r.appointment.doctor?.name || (r.doctor && typeof r.doctor === "object" ? r.doctor.name : undefined);
    } else {
      const dateVal = r.uploadedAt || r.createdAt;
      const uploadDateStr = dateVal ? new Date(dateVal).toLocaleDateString("en-IN") : "Unknown Date";
      key = `date-${uploadDateStr}`;
      dateObj = dateVal ? new Date(dateVal) : new Date();
      docName = r.doctor && typeof r.doctor === "object" ? r.doctor.name : r.uploadedBy?.name;
    }

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        date: dateObj,
        dateFormatted: dateObj.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }),
        appointmentRef: ref,
        chiefComplaint: complaint,
        doctorName: docName,
        reports: [],
      });
    }

    const group = map.get(key)!;
    group.reports.push(r);
    if (!group.doctorName && docName) group.doctorName = docName;
    if (!group.chiefComplaint && complaint) group.chiefComplaint = complaint;
  });

  return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function PatientRecordsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Doctor-scoped — only returns patients that have an appointment/admission/
  // lab order/radiology order with the logged-in doctor.
  const { data: myPatientsData, isLoading, isError } = useDoctorPatients({ search: debouncedSearch });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const patients: Patient[] = myPatientsData?.patients ?? [];
  const counts = myPatientsData?.counts;

  useEffect(() => {
    if (patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0]._id);
    }
  }, [patients, selectedPatientId]);

  const selectedPatient = patients.find((p) => p._id === selectedPatientId) ?? patients[0];

  const { data: realPrescriptions, isLoading: loadingPresc } = usePrescriptions(
    selectedPatient?._id ? { patient: selectedPatient._id } : undefined
  );

  const { data: reports = [], isLoading: reportsLoading } = usePatientReports(
    selectedPatient?._id
  );

  const selectedReport = reports?.find((r: any) => r._id === selectedReportId) || null;

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
        <AlertTriangle className="mb-2 h-10 w-10 text-red-400" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search your patients..."
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
              </div>
              <div className="space-y-2 max-h-48 sm:max-h-56 lg:h-[500px] lg:max-h-none overflow-y-auto pr-1">
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
              <div className="space-y-4 lg:col-span-3 min-w-0">
                {/* Tabs */}
                <div className="flex gap-1 border-b border-slate-200 overflow-x-auto max-w-full scrollbar-none flex-nowrap shrink-0 pb-0.5 pr-6">
                  {RECORD_TABS.map((tab, i) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(i)}
                      className={`px-3 py-2 text-xs font-semibold shrink-0 transition-colors border-b-2 whitespace-nowrap ${
                        activeTab === i ? "border-navy-700 text-navy-700 font-bold" : "border-transparent text-slate-500 hover:text-slate-700"
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
                          <p className="text-sm text-slate-700 break-all sm:break-normal">{f.value}</p>
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
                    {loadingPresc ? (
                      <div className="py-8 text-center text-slate-400">Loading Prescriptions...</div>
                    ) : realPrescriptions && realPrescriptions.length > 0 ? (
                      realPrescriptions.map((rx: any) => (
                        <Card key={rx._id}>
                          <div className="flex items-center justify-between border-b pb-2 mb-3">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-800">
                                Prescription {rx.prescriptionNumber || `#${rx._id.slice(-6)}`}
                              </h3>
                              <p className="text-xs text-slate-400">
                                Date: {new Date(rx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone={rx.status === "completed" ? "success" : "info"}>
                                {rx.status || "Issued"}
                              </Badge>
                              <a
                                href={`/api/v1/prescriptions/${rx._id}/download?token=${sessionStorage.getItem("hms_token") || ""}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 text-xs font-semibold transition"
                              >
                                <Eye className="h-3.5 w-3.5" /> View PDF
                              </a>
                            </div>
                          </div>
                          <div className="space-y-2 text-xs">
                            {rx.diagnosis && (
                              <p className="text-slate-600">
                                <span className="font-semibold text-slate-700">Diagnosis:</span> {rx.diagnosis}
                              </p>
                            )}
                            <p className="text-slate-600">
                              <span className="font-semibold text-slate-700">Prescriber:</span> Dr. {rx.doctor?.name || "Attending Physician"}
                            </p>
                            <div className="bg-slate-50 p-2.5 rounded-lg mt-2">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Prescribed Medicines</div>
                              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                                {rx.medications?.map((m: any, idx: number) => (
                                  <li key={idx}>
                                    <span className="font-semibold">{m.name}</span> {m.strength && `(${m.strength})`} — {m.dosage} ({m.frequency} for {m.duration})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <div className="py-8 text-center text-slate-400">No prescriptions issued.</div>
                    )}
                  </div>
                )}

                {/* Helper for consultation grouping */}
                {/* Lab Reports Tab */}
                {activeTab === 4 && (() => {
                  const isRadiologyReport = (r: any) => {
                    if (r.requestType === "Radiology") return true;
                    const name = String(r.testName || r.title || r.category || "").toLowerCase();
                    return /mri|x-ray|xray|ct\s*scan|ct\b|ultrasound|radiology|scan\b|mammogram|pet\s*scan|echo\b|ecg\b|usg\b|x\s*ray/.test(name);
                  };
                  const labReports = reports.filter((r: any) => !isRadiologyReport(r));
                  const labGroups = groupReportsByConsultation(labReports);

                  return (
                    <Card>
                      <div className="flex items-center justify-between mb-4 border-b pb-2">
                        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-navy-700" /> Lab Reports
                        </h3>
                        <span className="text-xs text-slate-400">
                          {labReports.length} {labReports.length === 1 ? "report" : "reports"} across {labGroups.length} {labGroups.length === 1 ? "consultation" : "consultations"}
                        </span>
                      </div>
                      {reportsLoading ? (
                        <div className="py-6 text-center text-slate-400">Loading laboratory reports...</div>
                      ) : labGroups.length === 0 ? (
                        <p className="text-sm text-slate-450 text-center py-6">
                          No laboratory reports published for this patient.
                        </p>
                      ) : (
                        <div className="space-y-6">
                          {labGroups.map((group, groupIdx) => {
                            const isLatest = groupIdx === 0;
                            return (
                              <div
                                key={group.id}
                                className={`rounded-xl border p-4 transition-all ${
                                  isLatest
                                    ? "border-emerald-300/80 bg-gradient-to-r from-emerald-50/40 via-slate-50 to-white shadow-sm ring-1 ring-emerald-200/50"
                                    : "border-slate-200 bg-slate-50/30"
                                }`}
                              >
                                {/* Consultation Header */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3 mb-3">
                                  <div className="flex items-center gap-2.5">
                                    {isLatest ? (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                                        <Activity className="h-3 w-3" /> Last Consultation
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                                        Previous Consultation
                                      </span>
                                    )}
                                    <span className="text-sm font-bold text-slate-800">
                                      {group.dateFormatted}
                                    </span>
                                    {group.appointmentRef && (
                                      <span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs font-medium text-slate-600">
                                        Ref: #{group.appointmentRef}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-slate-500">
                                    {group.doctorName && (
                                      <span>Doctor: <strong className="text-slate-700">Dr. {group.doctorName}</strong></span>
                                    )}
                                    <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-[11px] font-semibold text-navy-800">
                                      {group.reports.length} {group.reports.length === 1 ? "Report" : "Reports"}
                                    </span>
                                  </div>
                                </div>

                                {group.chiefComplaint && (
                                  <div className="mb-3 rounded-lg border border-slate-200/60 bg-white p-2 text-xs text-slate-600">
                                    <span className="font-semibold text-slate-700">Chief Complaint / Notes:</span> {group.chiefComplaint}
                                  </div>
                                )}

                                {/* Reports in this consultation */}
                                <div className="space-y-3">
                                  {group.reports.map((r) => (
                                    <div key={r._id} className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2 text-xs hover:border-navy-200 transition">
                                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-1.5">
                                        <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                          <FlaskConical className="h-3.5 w-3.5 text-navy-600" /> {r.testName}
                                        </span>
                                        <span className="text-xs text-slate-400">Date: {new Date(r.uploadedAt || r.createdAt).toLocaleDateString("en-IN")}</span>
                                      </div>
                                      <p className="text-slate-650"><span className="font-semibold text-slate-700">Uploaded By:</span> {r.uploadedBy?.name || "Technician"}</p>
                                      {r.observations && (
                                        <p className="text-slate-600"><span className="font-semibold text-slate-700">Observations:</span> {r.observations}</p>
                                      )}
                                      {r.remarks && (
                                        <p className="text-slate-500 italic"><span className="font-semibold text-slate-600">Remarks:</span> {r.remarks}</p>
                                      )}
                                      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100/60">
                                        <a
                                          href={r.files?.[0]?.secure_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold"
                                        >
                                          <Eye className="h-3.5 w-3.5" /> View Report
                                        </a>
                                        <a
                                          href={`/api/v1/diagnostic-reports/${r._id}/download?token=${sessionStorage.getItem("hms_token") || ""}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-green-700 hover:underline font-bold ml-2"
                                        >
                                          <Download className="h-3.5 w-3.5" /> Download Report
                                        </a>
                                        <button
                                          onClick={() => setSelectedReportId(r._id)}
                                          className="inline-flex items-center gap-1 text-navy-700 hover:underline font-bold ml-auto bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-1"
                                        >
                                          View Detailed Report
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  );
                })()}

                {/* Radiology Tab */}
                {activeTab === 5 && (() => {
                  const isRadiologyReport = (r: any) => {
                    if (r.requestType === "Radiology") return true;
                    const name = String(r.testName || r.title || r.category || "").toLowerCase();
                    return /mri|x-ray|xray|ct\s*scan|ct\b|ultrasound|radiology|scan\b|mammogram|pet\s*scan|echo\b|ecg\b|usg\b|x\s*ray/.test(name);
                  };
                  const radReports = reports.filter((r: any) => isRadiologyReport(r));
                  const radGroups = groupReportsByConsultation(radReports);

                  return (
                    <Card>
                      <div className="flex items-center justify-between mb-4 border-b pb-2">
                        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                          <ScanLine className="h-4 w-4 text-navy-700" /> Radiology Reports
                        </h3>
                        <span className="text-xs text-slate-400">
                          {radReports.length} {radReports.length === 1 ? "report" : "reports"} across {radGroups.length} {radGroups.length === 1 ? "consultation" : "consultations"}
                        </span>
                      </div>
                      {reportsLoading ? (
                        <div className="py-6 text-center text-slate-400">Loading radiology reports...</div>
                      ) : radGroups.length === 0 ? (
                        <p className="text-sm text-slate-450 text-center py-6">
                          No radiology reports published for this patient.
                        </p>
                      ) : (
                        <div className="space-y-6">
                          {radGroups.map((group, groupIdx) => {
                            const isLatest = groupIdx === 0;
                            return (
                              <div
                                key={group.id}
                                className={`rounded-xl border p-4 transition-all ${
                                  isLatest
                                    ? "border-emerald-300/80 bg-gradient-to-r from-emerald-50/40 via-purple-50/20 to-white shadow-sm ring-1 ring-emerald-200/50"
                                    : "border-slate-200 bg-slate-50/30"
                                }`}
                              >
                                {/* Consultation Header */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3 mb-3">
                                  <div className="flex items-center gap-2.5">
                                    {isLatest ? (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                                        <Activity className="h-3 w-3" /> Last Consultation
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                                        Previous Consultation
                                      </span>
                                    )}
                                    <span className="text-sm font-bold text-slate-800">
                                      {group.dateFormatted}
                                    </span>
                                    {group.appointmentRef && (
                                      <span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs font-medium text-slate-600">
                                        Ref: #{group.appointmentRef}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-slate-500">
                                    {group.doctorName && (
                                      <span>Doctor: <strong className="text-slate-700">Dr. {group.doctorName}</strong></span>
                                    )}
                                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold text-purple-800">
                                      {group.reports.length} {group.reports.length === 1 ? "Report" : "Reports"}
                                    </span>
                                  </div>
                                </div>

                                {group.chiefComplaint && (
                                  <div className="mb-3 rounded-lg border border-slate-200/60 bg-white p-2 text-xs text-slate-600">
                                    <span className="font-semibold text-slate-700">Chief Complaint / Notes:</span> {group.chiefComplaint}
                                  </div>
                                )}

                                {/* Reports in this consultation */}
                                <div className="space-y-3">
                                  {group.reports.map((r) => (
                                    <div key={r._id} className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2 text-xs hover:border-purple-300 transition">
                                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-1.5">
                                        <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                          <ScanLine className="h-3.5 w-3.5 text-navy-600" /> {r.testName}
                                        </span>
                                        <span className="text-xs text-slate-400">Date: {new Date(r.uploadedAt || r.createdAt).toLocaleDateString("en-IN")}</span>
                                      </div>
                                      <p className="text-slate-650"><span className="font-semibold text-slate-700">Uploaded By:</span> {r.uploadedBy?.name || "Radiologist"}</p>
                                      {r.observations && (
                                        <p className="text-slate-600"><span className="font-semibold text-slate-700">Findings:</span> {r.observations}</p>
                                      )}
                                      {r.remarks && (
                                        <p className="text-slate-500 italic"><span className="font-semibold text-slate-600">Remarks:</span> {r.remarks}</p>
                                      )}
                                      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100/60">
                                        <a
                                          href={r.files?.[0]?.secure_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold"
                                        >
                                          <Eye className="h-3.5 w-3.5" /> View Report
                                        </a>
                                        <a
                                          href={`/api/v1/diagnostic-reports/${r._id}/download?token=${sessionStorage.getItem("hms_token") || ""}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-green-700 hover:underline font-bold ml-2"
                                        >
                                          <Download className="h-3.5 w-3.5" /> Download Report
                                        </a>
                                        <button
                                          onClick={() => setSelectedReportId(r._id)}
                                          className="inline-flex items-center gap-1 text-navy-700 hover:underline font-bold ml-auto bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-1"
                                        >
                                          View Detailed Report
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  );
                })()}

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

      {selectedReport && (
        <Modal
          title={`${selectedReport.requestType} Investigation Report`}
          isOpen={!!selectedReportId}
          onClose={() => setSelectedReportId(null)}
        >
          <div className="space-y-4">
            {/* Patient Info */}
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs border border-slate-200">
              <div>
                <p className="font-semibold text-slate-450 uppercase">Patient Name</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedPatient?.name || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-455 uppercase">UHID</p>
                <p className="text-sm font-mono text-slate-800 mt-0.5">{selectedPatient?.uhid || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-450 uppercase">Age / Gender</p>
                <p className="text-sm font-medium text-slate-800 mt-0.5">
                  {selectedPatient?.age ? `${selectedPatient.age} Yrs` : "—"} / {selectedPatient?.gender || "—"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-450 uppercase">Ordering Doctor</p>
                <p className="text-sm font-medium text-slate-800 mt-0.5">Dr. {selectedReport.doctor?.name || "Attending Doctor"}</p>
              </div>
            </div>

            {/* Investigation Details */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Investigation Details</p>
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-150 text-xs space-y-1.5">
                <div>
                  <span className="text-slate-400 font-semibold">Test Name:</span> <span className="font-bold text-slate-800">{selectedReport.testName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Status:</span> <Badge tone="success">{selectedReport.status.toUpperCase()}</Badge>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Date:</span> <span className="font-medium text-slate-700">{new Date(selectedReport.uploadedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Findings & Remarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 space-y-1">
                <span className="font-bold text-slate-450 uppercase">Findings / Observations</span>
                <p className="text-slate-700 font-medium whitespace-pre-wrap">{selectedReport.observations || "No findings recorded."}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 space-y-1">
                <span className="font-bold text-slate-450 uppercase">Technical Remarks</span>
                <p className="text-slate-650 italic whitespace-pre-wrap">{selectedReport.remarks || "No technical remarks."}</p>
              </div>
            </div>

            {/* Attachments */}
            {selectedReport.files && selectedReport.files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Attached Files ({selectedReport.files.length})</p>
                <div className="flex flex-col gap-2">
                  {selectedReport.files.map((file: any, index: number) => {
                    const rawUrl = file.secure_url || file.url || file.path || "";
                    const resolvedUrl = rawUrl.startsWith("http") || rawUrl.startsWith("data:")
                      ? rawUrl
                      : rawUrl.startsWith("/")
                        ? `${window.location.origin}${rawUrl}`
                        : `/api/v1/diagnostic-reports/${selectedReport._id}/download?token=${sessionStorage.getItem("hms_token") || ""}`;
                    const filename = file.original_filename || file.name || "report_attachment.jpg";

                    return (
                      <div key={index} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5 text-xs shadow-xs">
                        <span className="font-semibold text-slate-700 truncate max-w-[250px]">{filename}</span>
                        <div className="flex items-center gap-2">
                          <a
                            href={resolvedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:underline text-blue-700 font-bold px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-xs transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> View Report
                          </a>
                          <a
                            href={resolvedUrl}
                            download={filename}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:underline text-emerald-700 font-bold ml-2 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded text-xs transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
