import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, UserCheck, UserX, Clock, CalendarOff, Star, Pencil, Trash2, Eye, Search, Filter, CalendarCheck, CalendarRange, FileSpreadsheet } from "lucide-react";
import { useStaffList, useTopStaff, useDeleteStaff } from "../../features/staff";
import { useBranchContext } from "../../context/BranchContext";
import { AllBranchesNoticeBanner } from "../../components/common/AllBranchesNoticeBanner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import toast from "react-hot-toast";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { Staff } from "../../types/domain";

const DUTY_TONE: Record<string, "success" | "warning" | "neutral" | "danger"> = {
  on_duty: "success",
  late: "warning",
  off_duty: "neutral",
  on_leave: "danger",
};

export function StaffPage() {
  const { isAllBranches } = useBranchContext();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data, isLoading } = useStaffList({
    page,
    search: search.trim() ? search : undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
  });

  const { data: topStaff } = useTopStaff();
  const deleteStaff = useDeleteStaff();
  const [deleteTargetStaff, setDeleteTargetStaff] = useState<{ id: string; name: string } | null>(null);

  const confirmDeleteStaff = async () => {
    if (!deleteTargetStaff) return;
    try {
      await deleteStaff.mutateAsync(deleteTargetStaff.id);
      toast.success(`Staff member ${deleteTargetStaff.name} removed successfully!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to remove staff member");
    } finally {
      setDeleteTargetStaff(null);
    }
  };

  const columns: Column<Staff>[] = [
    {
      header: "Staff Member",
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-xs font-extrabold text-navy-800 shadow-sm border border-navy-200">
            {s.name ? s.name.slice(0, 2).toUpperCase() : "ST"}
          </div>
          <div>
            <span className="font-extrabold text-slate-800 block">{s.name}</span>
            <span className="text-[11px] text-slate-500 font-mono">{s.employeeId || `EMP-${s._id.slice(-6).toUpperCase()}`}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Role / Speciality",
      render: (s) => (
        <div>
          <span className="text-xs font-bold text-slate-800 capitalize block">{s.role?.replace("_", " ") || "Hospital Staff"}</span>
          <span className="text-[11px] text-slate-400 font-medium">
            {typeof s.department === "object" && s.department ? (s.department as any).name : s.department || "General Operational"}
          </span>
        </div>
      ),
    },
    {
      header: "Contact Info",
      render: (s) => (
        <div>
          <span className="text-xs font-medium text-slate-700 block">{s.phone || "—"}</span>
          <span className="text-[11px] text-slate-400">{s.email || "—"}</span>
        </div>
      ),
    },
    {
      header: "Duty Status",
      render: (s) => (
        <Badge tone={DUTY_TONE[s.dutyStatus] || "neutral"}>
          {(s.dutyStatus || "off_duty").replace("_", " ").toUpperCase()}
        </Badge>
      ),
    },
    {
      header: "Workload Ratio",
      render: (s) => {
        const load = Math.min(Math.max(s.taskLoad || 35, 10), 100);
        return (
          <div className="w-28 space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-500">
              <span>Task Load</span>
              <span>{load}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  load > 80 ? "bg-rose-600" : load > 60 ? "bg-amber-500" : "bg-emerald-600"
                }`}
                style={{ width: `${load}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: "Actions",
      render: (s) => (
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/staff/${s._id}`}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-navy-50 hover:text-navy-700 transition-all"
            title="View Staff Details"
          >
            <Eye className="h-4 w-4" />
          </Link>
          {!isAllBranches ? (
            <>
              <Link
                to={`/admin/staff/${s._id}/edit`}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all"
                title="Edit Staff Member"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setDeleteTargetStaff({ id: s._id, name: s.name })}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                title="Delete Staff Member"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className="p-1.5 text-slate-300 cursor-not-allowed" title="Switch to a specific branch to edit or delete staff">
              <Pencil className="h-4 w-4 opacity-40" />
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AllBranchesNoticeBanner />

      {/* Page Header with Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff Management & HR Operations</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time attendance monitoring, staff rosters, shift scheduling, and employee registry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/staff/attendance">
            <Button variant="secondary" size="sm" className="gap-1.5 font-bold">
              <CalendarCheck className="h-4 w-4 text-emerald-600" /> Attendance Log
            </Button>
          </Link>
          <Link to="/admin/staff/shifts">
            <Button variant="secondary" size="sm" className="gap-1.5 font-bold">
              <CalendarRange className="h-4 w-4 text-indigo-600" /> Shift Rosters
            </Button>
          </Link>
          <Link to="/admin/staff/leaves">
            <Button variant="secondary" size="sm" className="gap-1.5 font-bold">
              <FileSpreadsheet className="h-4 w-4 text-amber-600" /> Leave Requests
            </Button>
          </Link>
          {!isAllBranches ? (
            <Link to="/admin/staff/new">
              <Button variant="primary" size="sm" className="gap-1.5 font-extrabold shadow">
                <UserPlus className="h-4 w-4" /> Onboard New Staff
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled className="gap-1.5 font-extrabold opacity-60 cursor-not-allowed bg-slate-100 text-slate-400" title="Switch to a specific branch to onboard staff">
              <UserPlus className="h-4 w-4" /> Onboard Staff (Read Only)
            </Button>
          )}
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Present On Duty" value={data?.counts.present ?? 0} icon={<UserCheck className="h-5 w-5 text-emerald-600" />} emphasis />
        <KpiCard label="Late Check-ins" value={data?.counts.late ?? 0} icon={<Clock className="h-5 w-5 text-amber-600" />} />
        <KpiCard label="Off Duty / Shift Off" value={data?.counts.absent ?? 0} icon={<UserX className="h-5 w-5 text-slate-500" />} />
        <KpiCard label="Approved Leave" value={data?.counts.onLeave ?? 0} icon={<CalendarOff className="h-5 w-5 text-rose-600" />} />
      </div>

      {/* Top Performers Section */}
      {topStaff && topStaff.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Top Rated Hospital Staff</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {topStaff.map((s, i) => (
              <Card key={s._id} className="p-4 border border-slate-200 bg-white hover:shadow-sm transition-all rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-black text-amber-800">
                    #{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-slate-800 truncate text-sm">{s.name}</div>
                    <div className="text-xs text-slate-500 truncate capitalize">{s.role?.replace("_", " ")}</div>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {s.rating || "4.9"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Staff Directory Card with Search & Role Filter */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Active Hospital Staff Directory</h3>
            <p className="text-xs text-slate-400 font-medium">Browse, search, and manage registered medical and administrative personnel.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff name or ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-56 rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs font-medium focus:border-navy-600 focus:outline-none shadow-sm"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-navy-600 focus:outline-none shadow-sm"
              >
                <option value="all">All Staff Roles</option>
                <option value="nurse">Nurses</option>
                <option value="receptionist">Receptionists</option>
                <option value="accountant">Accountants</option>
                <option value="pharmacist">Pharmacists</option>
                <option value="laboratory">Lab Technicians</option>
                <option value="radiology">Radiologists</option>
                <option value="hospital_admin">Admins</option>
              </select>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(s) => s._id}
          emptyMessage={isLoading ? "Retrieving staff records..." : "No matching staff records found."}
        />

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <p className="text-xs font-semibold text-slate-500">
            Showing Page <span className="font-extrabold text-slate-800">{data?.pagination?.page || page}</span> of{" "}
            <span className="font-extrabold text-slate-800">{data?.pagination?.totalPages || 1}</span> (Total Records:{" "}
            <span className="font-extrabold text-navy-800">{data?.pagination?.total || (data?.data?.length || 0)}</span>)
          </p>
          <Pagination page={page} totalPages={data?.pagination?.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </Card>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetStaff)}
        title="Confirm Deletion"
        message={`Are you sure you want to remove ${deleteTargetStaff?.name || "this staff member"} from hospital staff registry? This action cannot be undone.`}
        isLoading={deleteStaff.isPending}
        onClose={() => setDeleteTargetStaff(null)}
        onConfirm={confirmDeleteStaff}
      />
    </div>
  );
}
