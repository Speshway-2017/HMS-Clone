import { useState, useMemo } from "react";
import { Activity, Search, RefreshCw, Plus, Heart, AlertTriangle } from "lucide-react";
import { useNurseInpatients, useSaveNurseVitals } from "../../features/nurse";
import { DataTable, Column } from "../../components/ui/DataTable";
import { useStaffProfileMe } from "../../features/staff";

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

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vitalsModalPatient) return;
    try {
      await saveVitalsMutation.mutateAsync(vitalsForm);
      setVitalsModalPatient(null);
      refetch();
    } catch (err) {
      console.error(err);
    }
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
        const temp = row.latestVitals?.temperature || "98.6";
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
      render: (row) => <span className="font-bold text-slate-800">{row.latestVitals?.bloodPressure || "120/80"}</span>,
    },
    {
      header: "Pulse (bpm)",
      render: (row) => <span className="font-bold text-slate-800">{row.latestVitals?.pulseRate || "75"}</span>,
    },
    {
      header: "SpO2 (%)",
      render: (row) => {
        const sp = row.latestVitals?.oxygenSaturation || "98";
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
      render: (row) => <span className="text-xs font-semibold text-slate-700">{row.latestVitals?.painScore || "0"} / 10</span>,
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
          onClick={() => !isReadOnly && setVitalsModalPatient(row)}
          disabled={isReadOnly}
          className={`rounded-lg px-3 py-1 text-xs font-bold text-white shadow-sm transition-all ${
            isReadOnly 
              ? "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60" 
              : "bg-navy-900 hover:bg-navy-800"
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

            <form onSubmit={handleSaveVitals} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Temp (°F)</label>
                  <input type="text" value={vitalsForm.temperature} onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-xs" required />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">BP (mmHg)</label>
                  <input type="text" value={vitalsForm.bloodPressure} onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressure: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-xs" required />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Pulse (bpm)</label>
                  <input type="text" value={vitalsForm.pulseRate} onChange={(e) => setVitalsForm({ ...vitalsForm, pulseRate: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-xs" required />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">SpO2 (%)</label>
                  <input type="text" value={vitalsForm.oxygenSaturation} onChange={(e) => setVitalsForm({ ...vitalsForm, oxygenSaturation: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-xs" required />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Observation Notes</label>
                <textarea rows={2} value={vitalsForm.observationNotes} onChange={(e) => setVitalsForm({ ...vitalsForm, observationNotes: e.target.value })} className="mt-1 w-full rounded-lg border p-2 text-xs" placeholder="Patient condition notes..." />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setVitalsModalPatient(null)} className="rounded-lg border px-4 py-2 font-bold text-slate-600">Cancel</button>
                <button type="submit" className="rounded-lg bg-navy-900 px-4 py-2 font-bold text-white">Save Vitals</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
