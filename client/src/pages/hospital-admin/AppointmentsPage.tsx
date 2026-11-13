import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, CalendarClock, CalendarCheck2 } from "lucide-react";
import { useAppointments, mapAppointmentTypeForDisplay } from "../../features/appointments";
import { useBranchContext } from "../../context/BranchContext";
import { AllBranchesNoticeBanner } from "../../components/common/AllBranchesNoticeBanner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Appointment } from "../../types/domain";

const STATUS_TONE: Record<Appointment["status"], "success" | "info" | "warning" | "danger" | "neutral"> = {
  pending_payment: "danger",
  scheduled: "info",
  checked_in: "warning",
  in_consultation: "warning",
  completed: "success",
  cancelled: "neutral",
  no_show: "danger",
};

export function AppointmentsPage() {
  const { isAllBranches } = useBranchContext();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, isLoading } = useAppointments({ page, status: status || undefined });

  const columns: Column<Appointment>[] = [
    { header: "Reference", render: (a) => <span className="font-mono text-xs text-slate-500">{a.referenceId}</span> },
    { header: "Patient", render: (a) => <span className="font-medium text-slate-700">{a.patient && typeof a.patient === "object" ? a.patient.name : ""}</span> },
    {
      header: "Doctor & Department",
      render: (a) => (
        <div>
          <div className="text-slate-700">{a.doctor && typeof a.doctor === "object" ? a.doctor.name : ""}</div>
          <div className="text-xs text-slate-400">{a.department && typeof a.department === "object" ? a.department.name : ""}</div>
        </div>
      ),
    },
    {
      header: "Time & Type",
      render: (a) => (
        <div>
          <div className="text-slate-700">
            {new Date(a.date).toLocaleDateString()} · {a.time}
          </div>
          <div className="text-xs text-slate-400">{mapAppointmentTypeForDisplay(a.type)}</div>
        </div>
      ),
    },
    { header: "Status", render: (a) => <Badge tone={STATUS_TONE[a.status]}>{a.status.replace("_", " ")}</Badge> },
    {
      header: "Actions",
      render: (a) => (
        <Link to={`/admin/appointments/${a._id}`} className="text-sm font-medium text-emerald-700 hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AllBranchesNoticeBanner />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointment Management</h1>
          <p className="text-sm text-slate-500">Schedule, monitor, and manage patient flows.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Today's Appointments" value={data?.counts.today ?? 0} icon={<CalendarClock className="h-5 w-5" />} emphasis />
        <KpiCard label="Total Appointments" value={data?.counts.total ?? 0} icon={<CalendarCheck2 className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {["", "pending_payment", "scheduled", "checked_in", "in_consultation", "completed", "cancelled", "no_show"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === s ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {s === "" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        <DataTable columns={columns} rows={data?.data ?? []} rowKey={(a) => a._id} emptyMessage={isLoading ? "Loading..." : "No appointments found."} />

        <div className="mt-4 flex justify-end">
          <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
