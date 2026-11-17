import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, UserCheck, Users, Star, Pencil, Trash2, Eye, Search, Filter, ShieldCheck } from "lucide-react";
import { useStaffList, useTopStaff, useDeleteStaff } from "../../features/staff";
import { useRoles } from "../../features/roles";
import { useBranchContext } from "../../context/BranchContext";
import { AllBranchesNoticeBanner } from "../../components/common/AllBranchesNoticeBanner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
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

  const { data: roles } = useRoles();

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
      header: "Staff Member & ID",
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 border border-emerald-200">
            {s.name ? s.name.slice(0, 2).toUpperCase() : "ST"}
          </div>
          <div>
            <span className="font-bold text-slate-900 block leading-tight">{s.name}</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                {s.employeeId || `EMP-${s._id.slice(-6).toUpperCase()}`}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Role & Designation",
      render: (s) => (
        <div>
          <span className="text-xs font-bold text-slate-800 capitalize block">
            {s.role?.replace("_", " ") || "Hospital Staff"}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {s.dateOfJoining ? `Joined ${new Date(s.dateOfJoining).toLocaleDateString()}` : "Operational Personnel"}
          </span>
        </div>
      ),
    },
    {
      header: "Contact Info",
      render: (s) => (
        <div>
          <span className="text-xs font-medium text-slate-700 block font-mono">{s.phone || "—"}</span>
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
            <div className="flex justify-between text-[11px] font-semibold text-slate-600">
              <span>Shift Load</span>
              <span>{load}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  load > 80 ? "bg-rose-500" : load > 60 ? "bg-amber-500" : "bg-emerald-600"
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
        <div className="flex items-center gap-1.5 text-slate-400">
          <Link
            to={`/admin/staff/${s._id}`}
            className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-emerald-700 transition-colors"
            title="View Staff Profile"
          >
            <Eye className="h-4 w-4" />
          </Link>
          {!isAllBranches ? (
            <>
              <Link
                to={`/admin/staff/${s._id}/edit`}
                className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-emerald-700 transition-colors"
                title="Edit Staff Member"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setDeleteTargetStaff({ id: s._id, name: s.name })}
                className="rounded-lg p-1.5 hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition-colors"
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
    <div className="space-y-5">
      <AllBranchesNoticeBanner />

      {/* Page Header with Action Buttons and Integrated Telemetry Chips (replaces KPI cards) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Clinical & Support Staff</h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
              Staff Directory
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage clinical workforce, nurses, receptionists, technicians & auto-generated unique staff IDs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Integrated Telemetry Summary Chips */}
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            <Users className="h-3.5 w-3.5 text-emerald-700" />
            <span>Total Staff: <strong>{data?.pagination?.total || (data?.data ? data.data.length : 0)}</strong></span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Active: <strong>{data?.counts?.present ?? (data?.data ? data.data.length : 0)}</strong></span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-800">
            <Star className="h-3.5 w-3.5 text-amber-600 fill-amber-600" />
            <span>Top Rated: <strong>{topStaff?.length ?? 0}</strong></span>
          </span>

          {!isAllBranches ? (
            <Link to="/admin/staff/new" className="shrink-0">
              <Button variant="primary" size="sm" className="gap-1.5 font-bold shadow-xs">
                <UserPlus className="h-4 w-4" /> Onboard New Staff
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
              title="Switch to a specific branch to onboard staff"
            >
              <UserPlus className="h-4 w-4" /> Onboard Staff (Read Only)
            </Button>
          )}
        </div>
      </div>

      {/* Main Staff Registry Table with Search & Filter Bar */}
      <Card className="p-5 space-y-4">
        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by staff name, role or employee ID..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Roles</option>
              {roles
                ?.filter((r) => !["super_admin", "admin", "hospital_admin", "patient"].includes(r.role.toLowerCase()))
                .map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.label}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(s) => s._id}
          emptyMessage={isLoading ? "Loading staff registry..." : "No staff members found matching criteria."}
        />

        <div className="mt-4 flex justify-between items-center border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">
            Showing Page <strong>{page}</strong> of <strong>{data?.pagination?.totalPages || 1}</strong>
          </span>
          <Pagination page={page} totalPages={data?.pagination?.totalPages || 1} onPageChange={setPage} />
        </div>
      </Card>

      {/* Top Rated Hospital Staff Overview Strip */}
      {topStaff && topStaff.length > 0 && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span>Top Rated Clinical & Healthcare Staff</span>
            </h3>
            <span className="text-xs text-slate-400">Excellence Recognition</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topStaff.map((s, i) => (
              <div key={s._id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                  #{i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 truncate text-xs">{s.name}</div>
                  <div className="text-[11px] text-slate-500 truncate capitalize">{s.role?.replace("_", " ")}</div>
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full shrink-0">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {s.rating || "5.0"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetStaff)}
        title="Confirm Staff Removal"
        message={`Are you sure you want to remove ${deleteTargetStaff?.name || "this staff member"} from hospital registry? This action cannot be undone.`}
        isLoading={deleteStaff.isPending}
        onClose={() => setDeleteTargetStaff(null)}
        onConfirm={confirmDeleteStaff}
      />
    </div>
  );
}
