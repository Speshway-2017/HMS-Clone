import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Users2, BedDouble, Activity } from "lucide-react";
import { usePatients } from "../../features/patients";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Patient } from "../../types/domain";

const STATUS_TONE: Record<Patient["status"], "success" | "info" | "neutral"> = {
  admitted: "success",
  opd: "info",
  discharged: "neutral",
};

export function PatientsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = usePatients({ page, status: status || undefined, search: search || undefined });

  const columns: Column<Patient>[] = [
    {
      header: "Patient Name",
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-700">
            {p.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-800">{p.name}</div>
            <div className="text-xs text-slate-400">{p.email}</div>
          </div>
        </div>
      ),
    },
    { header: "Gender/Age", render: (p) => <span className="text-slate-600">{[p.gender, p.age ? `${p.age} yrs` : null].filter(Boolean).join(", ") || "—"}</span> },
    { header: "Assigned Doctor", render: (p) => <span className="text-slate-600">{typeof p.assignedDoctor === "object" && p.assignedDoctor ? p.assignedDoctor.name : "Unassigned"}</span> },
    {
      header: "Registered On",
      render: (p) => (
        <span className="text-xs text-slate-600 font-medium">
          {p.createdAt ? new Date(p.createdAt).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          }) : "N/A"}
        </span>
      )
    },
    { header: "Status", render: (p) => <Badge tone={STATUS_TONE[p.status]}>{p.status.toUpperCase()}</Badge> },
    {
      header: "Actions",
      render: (p) => (
        <Link to={`/admin/patients/${p._id}`} className="text-sm font-medium text-navy-700 hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Management</h1>
          <p className="text-sm text-slate-500">Manage and monitor all hospital patient records and admission flows.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Patients" value={data?.counts.total ?? 0} icon={<Users2 className="h-5 w-5" />} emphasis trend={{ direction: "up", text: `${data?.counts.newToday ?? 0} new today` }} />
        <KpiCard label="Admitted" value={data?.counts.admitted ?? 0} icon={<BedDouble className="h-5 w-5" />} />
        <KpiCard label="OPD" value={data?.counts.opd ?? 0} icon={<Activity className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search patients..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Records</option>
            <option value="admitted">Admitted</option>
            <option value="opd">OPD</option>
            <option value="discharged">Discharged</option>
          </select>
        </div>

        <DataTable columns={columns} rows={data?.data ?? []} rowKey={(p) => p._id} emptyMessage={isLoading ? "Loading..." : "No patients found."} />

        <div className="mt-4 flex justify-end">
          <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
