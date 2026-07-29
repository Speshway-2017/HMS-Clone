import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Users, Search, RefreshCw, Activity, Pill, FileText, Plus, Shield, Clock } from "lucide-react";
import { useNurseInpatients, useSaveNurseVitals, useAddNurseNotes } from "../../features/nurse";
import { DataTable, Column } from "../../components/ui/DataTable";

export function AssignedPatientsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWard, setSelectedWard] = useState("all");
  const [vitalsFilter, setVitalsFilter] = useState("all");

  const [vitalsModalPatient, setVitalsModalPatient] = useState<any | null>(null);
  const [notesModalPatient, setNotesModalPatient] = useState<any | null>(null);

  const [vitalsForm, setVitalsForm] = useState({
    temperature: "98.6",
    bloodPressure: "120/80",
    pulseRate: "75",
    respiratoryRate: "18",
    oxygenSaturation: "98",
    weight: "70",
    height: "175",
    painScore: "0",
    observationNotes: "",
  });

  const [noteFormText, setNoteFormText] = useState("");

  const { data: inpatients = [], isLoading, refetch } = useNurseInpatients();
  const saveVitalsMutation = useSaveNurseVitals(vitalsModalPatient?._id || vitalsModalPatient?.patient?._id || "");
  const saveNotesMutation = useAddNurseNotes(notesModalPatient?._id || notesModalPatient?.patient?._id || "");

  const filteredPatients = useMemo(() => {
    return inpatients.filter((pt: any) => {
      const pName = pt.patientName || pt.patient?.name || "";
      const pUhid = pt.uhid || pt.patient?.uhid || "";
      const wardName = pt.wardName || pt.ward?.name || "";

      const matchesSearch = pName.toLowerCase().includes(searchTerm.toLowerCase()) || pUhid.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesWard = selectedWard === "all" || wardName.toLowerCase() === selectedWard.toLowerCase();

      let matchesVitals = true;
      if (vitalsFilter === "pending") matchesVitals = !pt.latestVitals || !pt.vitalsRecordedToday;
      if (vitalsFilter === "critical") matchesVitals = pt.isCritical || (pt.latestVitals && (Number(pt.latestVitals.oxygenSaturation) < 94 || Number(pt.latestVitals.temperature) > 100.4));

      return matchesSearch && matchesWard && matchesVitals;
    });
  }, [inpatients, searchTerm, selectedWard, vitalsFilter]);

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

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesModalPatient || !noteFormText.trim()) return;
    try {
      await saveNotesMutation.mutateAsync({ notes: noteFormText });
      setNotesModalPatient(null);
      setNoteFormText("");
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const columns: Column<any>[] = [
    {
      header: "Patient Name / UHID",
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.patientName || row.patient?.name || "Inpatient"}</p>
          <p className="text-xs text-slate-500 font-mono">UHID: {row.uhid || row.patient?.uhid || "N/A"}</p>
          {row.age && <p className="text-[10px] text-slate-400">{row.age} yrs | {row.gender || "Gender N/A"}</p>}
        </div>
      ),
    },
    {
      header: "Ward / Room / Bed",
      render: (row) => (
        <div>
          <span className="rounded bg-navy-50 px-2 py-0.5 text-xs font-bold text-navy-800">
            {row.bedNumber || row.bed?.bedNumber || "Bed N/A"}
          </span>
          <p className="mt-1 text-xs text-slate-500">{row.wardName || row.ward?.name || "General Ward"} (Room: {row.roomNumber || row.room?.roomNumber || "101"})</p>
        </div>
      ),
    },
    {
      header: "Attending Doctor",
      render: (row) => (
        <div>
          <p className="text-xs font-bold text-slate-800">{row.doctorName || row.doctor?.name || "Dr. Assigned"}</p>
          <p className="text-[10px] text-slate-400">Primary Consultant</p>
        </div>
      ),
    },
    {
      header: "Latest Vitals Status",
      render: (row) => {
        const v = row.latestVitals;
        if (!v) return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">Check Required</span>;

        const isAlert = Number(v.oxygenSaturation) < 94 || Number(v.temperature) > 100.4;
        return (
          <div className="space-y-0.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${isAlert ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <Activity className="h-3 w-3" /> BP: {v.bloodPressure || "120/80"}
            </span>
            <p className="text-[10px] text-slate-500">Pulse: {v.pulseRate || "72"} | SpO2: {v.oxygenSaturation || "98"}%</p>
          </div>
        );
      },
    },
    {
      header: "Care Level",
      render: (row) => (
        <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${row.careLevel === "ICU" ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>
          {row.careLevel || "General"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVitalsModalPatient(row)}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
          >
            <Activity className="h-3.5 w-3.5" /> Log Vitals
          </button>
          <button
            onClick={() => setNotesModalPatient(row)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
          >
            <FileText className="h-3.5 w-3.5" /> Add Note
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Nurse</span>
            <span>/</span>
            <span className="text-slate-700">Assigned Patients</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Assigned Inpatients</h1>
          <p className="text-xs text-slate-500">Manage patients assigned to your active shift and monitor nursing activities.</p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh Roster
        </button>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by patient name, UHID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-navy-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Wards</option>
              <option value="general">General Ward</option>
              <option value="icu">ICU</option>
              <option value="pediatrics">Pediatrics</option>
              <option value="emergency">Emergency Ward</option>
            </select>

            <select
              value={vitalsFilter}
              onChange={(e) => setVitalsFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Vitals Status</option>
              <option value="pending">Check Required</option>
              <option value="critical">Critical Alarms</option>
            </select>
          </div>
        </div>

        {/* Standard DataTable Component */}
        <DataTable
          columns={columns}
          rows={filteredPatients}
          rowKey={(r: any) => r._id || Math.random().toString()}
          emptyMessage="No assigned patients found matching criteria."
        />
      </div>

      {/* Modal: Log Vitals */}
      {vitalsModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Record Vitals: {vitalsModalPatient.patientName || vitalsModalPatient.patient?.name}</h3>
              <button onClick={() => setVitalsModalPatient(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveVitals} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Temperature (°F)</label>
                  <input
                    type="text"
                    value={vitalsForm.temperature}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                    className="mt-1 w-full rounded-lg border p-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Blood Pressure (mmHg)</label>
                  <input
                    type="text"
                    value={vitalsForm.bloodPressure}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressure: e.target.value })}
                    className="mt-1 w-full rounded-lg border p-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Pulse Rate (bpm)</label>
                  <input
                    type="text"
                    value={vitalsForm.pulseRate}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, pulseRate: e.target.value })}
                    className="mt-1 w-full rounded-lg border p-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Oxygen Saturation SpO2 (%)</label>
                  <input
                    type="text"
                    value={vitalsForm.oxygenSaturation}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, oxygenSaturation: e.target.value })}
                    className="mt-1 w-full rounded-lg border p-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Observation Notes</label>
                <textarea
                  rows={2}
                  value={vitalsForm.observationNotes}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, observationNotes: e.target.value })}
                  className="mt-1 w-full rounded-lg border p-2 text-xs"
                  placeholder="Patient general condition, pain score..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setVitalsModalPatient(null)} className="rounded-lg border px-4 py-2 font-bold text-slate-600">Cancel</button>
                <button type="submit" className="rounded-lg bg-navy-900 px-4 py-2 font-bold text-white">Save Vitals</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Note */}
      {notesModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Clinical Note: {notesModalPatient.patientName || notesModalPatient.patient?.name}</h3>
              <button onClick={() => setNotesModalPatient(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveNotes} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Nursing Note Content</label>
                <textarea
                  rows={4}
                  value={noteFormText}
                  onChange={(e) => setNoteFormText(e.target.value)}
                  className="mt-1 w-full rounded-lg border p-2.5 text-xs focus:outline-none"
                  placeholder="Enter observation notes, care progress, doctor instructions..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setNotesModalPatient(null)} className="rounded-lg border px-4 py-2 font-bold text-slate-600">Cancel</button>
                <button type="submit" className="rounded-lg bg-navy-900 px-4 py-2 font-bold text-white">Log Note</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
