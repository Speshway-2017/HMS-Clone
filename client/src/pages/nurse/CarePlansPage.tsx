import { useState, useMemo } from "react";
import { ClipboardCheck, Search, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useNurseInpatients } from "../../features/nurse";
import { DataTable, Column } from "../../components/ui/DataTable";

export function CarePlansPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: inpatients = [], isLoading, refetch } = useNurseInpatients();

  const filteredPatients = useMemo(() => {
    return inpatients.filter((pt: any) => {
      const pName = pt.patientName || pt.patient?.name || "";
      const pUhid = pt.uhid || pt.patient?.uhid || "";
      return pName.toLowerCase().includes(searchTerm.toLowerCase()) || pUhid.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [inpatients, searchTerm]);

  const columns: Column<any>[] = [
    {
      header: "Patient / Location",
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.patientName || row.patient?.name || "Inpatient"}</p>
          <p className="text-xs text-slate-500 font-mono">UHID: {row.uhid || row.patient?.uhid || "N/A"}</p>
          <span className="text-[10px] text-slate-400">Bed: {row.bedNumber || row.bed?.bedNumber || "N/A"} ({row.wardName || row.ward?.name || "Ward"})</span>
        </div>
      ),
    },
    {
      header: "Bedside Hygiene",
      render: (row) => (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </span>
      ),
    },
    {
      header: "IV Line Status",
      render: (row) => <span className="text-xs font-semibold text-slate-700">IV Line Checked & Clear</span>,
    },
    {
      header: "Catheter Care",
      render: (row) => <span className="text-xs font-semibold text-slate-700">Flushed / Normal</span>,
    },
    {
      header: "Fall Risk Assessment",
      render: (row) => (
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${row.careLevel === "ICU" ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
          {row.careLevel === "ICU" ? "Moderate Risk" : "Low Risk"}
        </span>
      ),
    },
    {
      header: "Intervention Status",
      render: (row) => (
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
          Care Plan Active
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Nurse</span>
            <span>/</span>
            <span className="text-slate-700">Care Plans</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Nursing Care Plans & Bedside Checks</h1>
          <p className="text-xs text-slate-500">Execute daily nursing interventions, hygiene checks, and patient bedside care plans.</p>
        </div>
      </div>

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
          emptyMessage="No care plans found for assigned inpatients."
        />
      </div>
    </div>
  );
}
