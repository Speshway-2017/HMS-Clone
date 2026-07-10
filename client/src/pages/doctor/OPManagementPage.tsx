import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search, Filter, Clock, User, ChevronRight, Stethoscope,
  FileText, Pill, CalendarClock, CheckCircle2, XCircle, RotateCcw, Plus,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useDoctorProfileMe } from "../../features/doctors";
import { useAppointments, useUpdateAppointment } from "../../features/appointments";

const STATUS_BADGE: Record<string, { tone: "success" | "warning" | "info" | "neutral" | "danger"; label: string }> = {
  completed:       { tone: "success",  label: "Completed"       },
  in_consultation: { tone: "warning",  label: "In Consultation" },
  checked_in:      { tone: "info",     label: "Checked In"      },
  scheduled:       { tone: "neutral",  label: "Scheduled"       },
  cancelled:       { tone: "danger",   label: "Cancelled"       },
  no_show:         { tone: "danger",   label: "No Show"         },
};

type View = "queue" | "consultation" | "prescription";

export function OPManagementPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeView, setActiveView] = useState<View>("queue");
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  const { data: doctorProfile } = useDoctorProfileMe();
  const todayStr = new Date().toISOString().split("T")[0];
  
  const { data: appointmentsData, isLoading } = useAppointments(
    { doctor: doctorProfile?._id, from: todayStr, to: todayStr },
    { enabled: !!doctorProfile?._id }
  );

  const appointments = appointmentsData?.data || [];
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);

  useEffect(() => {
    if (appointments.length > 0 && !selectedApptId) {
      setSelectedApptId(appointments[0]._id);
      setNotes(appointments[0].notes || "");
    }
  }, [appointments, selectedApptId]);

  const selectedAppt = appointments.find((a) => a._id === selectedApptId) || appointments[0];
  const updateAppointment = useUpdateAppointment(selectedAppt?._id || "");

  const handleSelect = (a: any) => {
    setSelectedApptId(a._id);
    setNotes(a.notes || "");
    setDiagnosis("");
  };

  const handleMarkComplete = async () => {
    if (!selectedAppt) return;
    try {
      await updateAppointment.mutateAsync({ status: "completed", notes: notes || diagnosis });
      setActiveView("queue");
    } catch (err) {
      console.error("Failed to complete appointment", err);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedAppt) return;
    try {
      await updateAppointment.mutateAsync({ status: status as any });
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const mapStatus = (status: string) => {
    if (status === "completed") return "completed";
    if (status === "in_consultation") return "in_progress";
    if (["checked_in", "scheduled"].includes(status)) return "waiting";
    return "scheduled";
  };

  const filtered = appointments.filter((appt) => {
    const p = appt.patient as any;
    const name = p?.name || "Unknown Patient";
    const token = appt.referenceId || appt._id.slice(-6);
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || token.toLowerCase().includes(search.toLowerCase());
    
    const mapped = mapStatus(appt.status);
    const matchStatus = statusFilter === "all" || mapped === statusFilter;
    
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
      </div>
    );
  }

  const selectedPatient = selectedAppt?.patient as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">OP Management</h1>
          <p className="text-sm text-slate-500">Outpatient queue, consultations, prescriptions and follow-ups.</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200">
          {(["queue", "consultation", "prescription"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeView === v ? "bg-navy-700 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {v === "queue" ? "OP Queue" : v === "consultation" ? "Consultation" : "Prescription"}
            </button>
          ))}
        </div>
      </div>

      {appointments.length === 0 ? (
        <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
          <CalendarClock className="mb-2 h-10 w-10 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600">No OP Appointments Today</h3>
          <p className="text-xs text-slate-400">There are no outpatient consultations scheduled on your list today.</p>
        </Card>
      ) : (
        <>
          {/* OP Queue View */}
          {activeView === "queue" && selectedAppt && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Queue List */}
              <div className="lg:col-span-2 space-y-4">
                {/* Filters */}
                <Card className="p-4">
                  <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search patient or token..."
                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                      />
                    </div>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                      {["all", "waiting", "in_progress", "scheduled", "completed"].map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                            statusFilter === s ? "bg-white text-navy-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {s === "all" ? "All" : s.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Queue Items */}
                <div className="space-y-2">
                  {filtered.map((appt) => {
                    const p = appt.patient as any;
                    const token = appt.referenceId || appt._id.slice(-6);
                    const isSelected = selectedAppt._id === appt._id;

                    return (
                      <div
                        key={appt._id}
                        onClick={() => handleSelect(appt)}
                        className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 cursor-pointer transition-all hover:shadow-sm ${
                          isSelected
                            ? "border-navy-300 bg-navy-50 shadow-sm"
                            : appt.status === "in_consultation"
                            ? "border-amber-200 bg-amber-50"
                            : "border-slate-100 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-700">
                          {token.slice(-3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800">{p?.name || "Unknown Patient"}</p>
                            <span className="text-xs text-slate-400">{p?.age || 35}y · {p?.gender || "—"}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{appt.notes || "No pre-visit notes"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge tone={STATUS_BADGE[appt.status]?.tone || "neutral"}>
                            {STATUS_BADGE[appt.status]?.label || appt.status}
                          </Badge>
                          <p className="mt-1 text-xs text-slate-400 flex items-center justify-end gap-1">
                            <Clock className="h-3 w-3" /> {appt.time}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Patient Quick View Panel */}
              <div className="space-y-4">
                <Card>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">{selectedPatient?.name || "Unknown Patient"}</h3>
                      <p className="text-xs text-slate-500">{selectedPatient?.age || 35} yrs · {selectedPatient?.gender || "—"} · {selectedAppt.referenceId || selectedAppt._id.slice(-6)}</p>
                    </div>
                    <Badge tone={STATUS_BADGE[selectedAppt.status]?.tone || "neutral"}>
                      {STATUS_BADGE[selectedAppt.status]?.label || selectedAppt.status}
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Chief Complaint / Notes</p>
                      <p className="text-sm text-slate-700">{selectedAppt.notes || "Routine consultation check-up."}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-slate-50 p-2">
                        <p className="text-xs text-slate-400">Scheduled Time</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedAppt.time}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2">
                        <p className="text-xs text-slate-400">Consultation Type</p>
                        <p className="text-sm font-semibold text-slate-700">{selectedAppt.type || "General"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        handleUpdateStatus("in_consultation");
                        setActiveView("consultation");
                      }}
                      className="flex items-center justify-center gap-2 w-full rounded-lg bg-navy-700 px-3 py-2 text-sm font-medium text-white hover:bg-navy-800 transition-colors"
                    >
                      <Stethoscope className="h-4 w-4" /> Start Consultation
                    </button>
                    <button
                      onClick={() => setActiveView("prescription")}
                      className="flex items-center justify-center gap-2 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 transition-colors"
                    >
                      <Pill className="h-4 w-4" /> Write Prescription
                    </button>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleUpdateStatus("in_consultation")}
                        className="flex items-center justify-center gap-1 rounded-lg border border-emerald-200 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Accept
                      </button>
                      <button
                        onClick={() => handleUpdateStatus("cancelled")}
                        className="flex items-center justify-center gap-1 rounded-lg border border-red-200 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-3 w-3" /> Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateStatus("scheduled")}
                        className="flex items-center justify-center gap-1 rounded-lg border border-amber-200 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                      >
                        <RotateCcw className="h-3 w-3" /> Re-schedule
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Consultation View */}
          {activeView === "consultation" && selectedAppt && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {/* Patient Info Bar */}
                <Card className="p-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-700 text-lg font-bold text-white">
                    {(selectedPatient?.name || "Unknown Patient").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{selectedPatient?.name || "Unknown Patient"}</p>
                    <p className="text-xs text-slate-500">{selectedPatient?.age || 35} yrs · {selectedPatient?.gender || "—"} · {selectedAppt.type || "General"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div><p className="text-xs text-slate-400">BP</p><p className="text-sm font-semibold text-slate-700">120/80</p></div>
                    <div><p className="text-xs text-slate-400">Temp</p><p className="text-sm font-semibold text-slate-700">98.6°F</p></div>
                  </div>
                  <Badge tone={STATUS_BADGE[selectedAppt.status]?.tone || "neutral"}>
                    {STATUS_BADGE[selectedAppt.status]?.label || selectedAppt.status}
                  </Badge>
                </Card>

                {/* Diagnosis */}
                <Card>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Primary Diagnosis</h3>
                  <input
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-200"
                    placeholder="Enter ICD-10 diagnosis..."
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {["I10 — Essential Hypertension", "E11 — Type 2 Diabetes", "M54.5 — Low Back Pain", "J06.9 — Acute Upper Respiratory Infection"].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDiagnosis(d)}
                        className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600 hover:border-navy-300 hover:bg-navy-50"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Clinical Notes */}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-navy-700" /> Medical Notes
                    </h3>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                    placeholder="Write clinical observations, history, examination findings..."
                  />
                  <div className="mt-3 flex gap-2">
                    <Button variant="primary" onClick={() => setActiveView("prescription")}>
                      <Pill className="h-4 w-4" /> Write Prescription
                    </Button>
                    <Button variant="secondary" onClick={handleMarkComplete}>
                      <CheckCircle2 className="h-4 w-4" /> Mark Complete
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Right Panel: History */}
              <div className="space-y-4">
                <Card>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Allergies</h3>
                  <p className="text-xs text-slate-600 italic">{selectedPatient?.allergies || "No allergies reported."}</p>
                </Card>
                <Card>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Insurance</h3>
                  <p className="text-xs text-slate-600">{selectedPatient?.insuranceProvider || "Self-Pay"} ({selectedPatient?.insurancePolicyNumber || "No Policy"})</p>
                </Card>
              </div>
            </div>
          )}

          {/* Prescription View */}
          {activeView === "prescription" && selectedAppt && (
            <div className="space-y-4">
              {/* Rx Header */}
              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-navy-700">Electronic Prescription</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Date: {new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">Patient: {selectedPatient?.name || "Unknown Patient"}</p>
                    <p className="text-xs text-slate-500">{selectedPatient?.age || 35} yrs · {selectedPatient?.gender || "—"}</p>
                    <p className="text-xs text-slate-500 mt-1">Dx: {diagnosis || "Consultation"}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">Prescribed Medications</h3>
                  <button className="flex items-center gap-1 text-xs font-medium text-navy-700 hover:underline">
                    <Plus className="h-3.5 w-3.5" /> Add Drug
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Drug Name</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Dose</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Frequency</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Duration</th>
                        <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-400">Route</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { drug: "Paracetamol", dose: "500mg", freq: "Thrice daily", dur: "5 days", route: "Oral" },
                        { drug: "Amoxicillin", dose: "500mg", freq: "Twice daily", dur: "7 days", route: "Oral" }
                      ].map((drug, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-3 font-medium text-slate-800">{drug.drug}</td>
                          <td className="py-3 text-slate-600">{drug.dose}</td>
                          <td className="py-3 text-slate-600">{drug.freq}</td>
                          <td className="py-3 text-slate-600">{drug.dur}</td>
                          <td className="py-3 text-slate-600">{drug.route}</td>
                          <td className="py-3">
                            <button className="text-xs text-red-500 hover:underline">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Additional Instructions</h3>
                <textarea
                  rows={3}
                  defaultValue="Take medications after meals. Rest well. Follow-up if symptoms persist."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                />
                <div className="mt-3 flex gap-2">
                  <Button variant="primary" onClick={handleMarkComplete}>
                    <CheckCircle2 className="h-4 w-4" /> Save &amp; Issue
                  </Button>
                  <Button variant="secondary" onClick={() => setActiveView("queue")}>Cancel</Button>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
