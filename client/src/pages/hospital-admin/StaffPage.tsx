import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, UserCheck, UserX, Clock, CalendarOff, Star, Pencil, Trash2, Eye } from "lucide-react";
import { useStaffList, useTopStaff, useDeleteStaff } from "../../features/staff";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Staff } from "../../types/domain";

const DUTY_TONE: Record<Staff["dutyStatus"], "success" | "warning" | "neutral" | "danger"> = {
  on_duty: "success",
  late: "warning",
  off_duty: "neutral",
  on_leave: "danger",
};

export function StaffPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useStaffList({ page });
  const { data: topStaff } = useTopStaff();
  const deleteStaff = useDeleteStaff();

  const columns: Column<Staff>[] = [
    {
      header: "Staff Member",
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-700">
            {s.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-slate-800 block">{s.name}</span>
            {s.employeeId && <span className="text-[10px] text-slate-400 font-mono">{s.employeeId}</span>}
          </div>
        </div>
      ),
    },
    { header: "Role", render: (s) => <span className="text-slate-600 font-medium capitalize">{s.role || "—"}</span> },
    { header: "Check-in", render: (s) => <span className="text-slate-600">{s.checkInTime || "--"}</span> },
    { header: "Duty Status", render: (s) => <Badge tone={DUTY_TONE[s.dutyStatus]}>{s.dutyStatus.replace("_", " ")}</Badge> },
    {
      header: "Task Load",
      render: (s) => (
        <div className="h-2 w-24 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-navy-700" style={{ width: `${s.taskLoad}%` }} />
        </div>
      ),
    },
    {
      header: "Actions",
      render: (s) => (
        <div className="flex items-center gap-3 text-slate-400">
          <Link to={`/admin/staff/${s._id}`} className="hover:text-navy-700 p-1" title="View Staff Profile">
            <Eye className="h-4 w-4 text-slate-600 hover:text-navy-700" />
          </Link>
          <Link to={`/admin/staff/${s._id}/edit`} className="hover:text-navy-700 p-1" title="Edit Staff Details">
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={() => {
              if (confirm(`Remove ${s.name}?`)) deleteStaff.mutate(s._id);
            }}
            className="hover:text-red-600 p-1"
            title="Delete Staff Member"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
          <p className="text-sm text-slate-500">Real-time attendance and performance overview.</p>
        </div>
        <Link to="/admin/staff/new">
          <Button variant="primary">
            <UserPlus className="h-4 w-4" /> Add New Staff
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Present" value={data?.counts.present ?? 0} icon={<UserCheck className="h-5 w-5" />} emphasis />
        <KpiCard label="Late" value={data?.counts.late ?? 0} icon={<Clock className="h-5 w-5" />} />
        <KpiCard label="Absent" value={data?.counts.absent ?? 0} icon={<UserX className="h-5 w-5" />} />
        <KpiCard label="On Leave" value={data?.counts.onLeave ?? 0} icon={<CalendarOff className="h-5 w-5" />} />
      </div>

      {topStaff && topStaff.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {topStaff.map((s, i) => (
            <Card key={s._id}>
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">{i + 1}</span>
                <div>
                  <div className="font-semibold text-slate-800">{s.name}</div>
                  <div className="text-xs text-slate-500">{s.role}</div>
                </div>
                <span className="ml-auto flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-amber-500" /> {s.rating}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <h3 className="mb-4 text-base font-semibold text-slate-800">Staff Directory</h3>
        <DataTable columns={columns} rows={data?.data ?? []} rowKey={(s) => s._id} emptyMessage={isLoading ? "Loading..." : "No staff records yet."} />
        <div className="mt-4 flex justify-end">
          <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
