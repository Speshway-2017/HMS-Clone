import { useState, useEffect } from "react";
// ── SECURITY FIX: use doctor-scoped hook, NOT usePatients() ──────────────────
// usePatients() calls /api/v1/patients which returns ALL hospital patients.
// useDoctorPatients() calls /doctors/dashboard/my-patients — the server
// enforces doctor ownership at the MongoDB level (no cross-doctor leakage).
import { useDoctorPatients } from "../../features/doctorDashboard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Search, User, History, ShieldAlert } from "lucide-react";
import type { Patient } from "../../types/domain";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  admitted: "warning",
  opd: "info",
  discharged: "neutral",
};

export function PatientsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: myData, isLoading, isError, refetch } = useDoctorPatients({ search: debouncedSearch });

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const patients: Patient[] = myData?.patients ?? [];

  if (isLoading && !debouncedSearch && patients.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200"></div>
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200"></div>
        <div className="space-y-2 mt-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 w-full animate-pulse rounded bg-slate-200"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-red-200 bg-red-50">
        <ShieldAlert className="mb-2 h-10 w-10 text-red-400" />
        <h3 className="text-sm font-semibold text-red-600">Failed to load patients list</h3>
        <p className="text-xs text-red-400">Please try reloading the page or check your connection.</p>
        <button onClick={() => refetch()} className="mt-4 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium">
          Retry
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Patients Registry</h1>
        <p className="text-sm text-slate-500">Search your patients and view their full medical history logs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patients List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search your patients..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>
          </Card>

          {patients.length === 0 ? (
            <Card className="py-12 flex flex-col items-center justify-center text-center border-dashed border-slate-200 bg-slate-50">
              <User className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">No patients assigned to you.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Patients will appear here once appointments, admissions, lab orders,
                or radiology orders are assigned to you.
              </p>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {patients.map((p) => (
                <div
                  key={p._id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-3 border rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedPatient?._id === p._id ? "border-navy-700 bg-navy-50/50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">{p.name}</h4>
                    <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{p.phone ? `Phone: ${p.phone}` : ""}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Medical History Detail */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <Card className="p-6 space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-bold text-slate-900">{selectedPatient.name}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Age: {selectedPatient.age || "—"} · Gender: {selectedPatient.gender || "—"}
                </p>
                {selectedPatient.allergies && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                    ⚠️ Allergies: {selectedPatient.allergies}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                  <History className="h-4 w-4" /> Medical History Logs
                </h3>
                {!selectedPatient.medicalHistory || selectedPatient.medicalHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">No medical history entries recorded for this patient.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedPatient.medicalHistory.map((mh, idx) => {
                      const mhDate = new Date(mh.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <div key={idx} className="border-l-2 border-navy-100 pl-4 py-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-navy-700 bg-navy-50 px-2 py-0.5 rounded">
                              {mh.visitType || "Consultation"}
                            </span>
                            <span className="text-[10px] text-slate-400">{mhDate}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 mt-2">Dr. {mh.doctorName || "Attending Doctor"}</p>
                          <p className="text-xs text-slate-600 mt-1"><span className="font-medium text-slate-800">Diagnosis:</span> {mh.diagnosis || "Observation"}</p>
                          {mh.notes && (
                            <p className="text-xs text-slate-500 mt-1 rounded bg-slate-50 p-2 border border-slate-100 whitespace-pre-wrap">{mh.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="flex h-64 flex-col items-center justify-center p-6 text-center border-dashed border-slate-200 bg-slate-50">
              <User className="mb-2 h-10 w-10 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-600">Select a Patient</h3>
              <p className="text-xs text-slate-400">Choose a patient from the list on the left to view their detailed medical profile and logs.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
