import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Stethoscope, Activity, CalendarOff, Pencil, Trash2, Eye, Search, Filter, ShieldCheck } from "lucide-react";
import { useDoctors, useDeleteDoctor } from "../../features/doctors";
import { useDepartments } from "../../features/departments";
import { useBranchContext } from "../../context/BranchContext";
import { AllBranchesNoticeBanner } from "../../components/common/AllBranchesNoticeBanner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import toast from "react-hot-toast";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { Doctor } from "../../types/domain";

const STATUS_TONE: Record<Doctor["status"], "success" | "danger" | "neutral"> = {
  on_duty: "success",
  on_leave: "danger",
  off_duty: "neutral",
};

export function DoctorsPage() {
  const { isAllBranches } = useBranchContext();
  const [page, setPage] = useState(1);
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useDoctors({ page, department: department || undefined, status: status || undefined, search: search || undefined });
  const { data: departments } = useDepartments();
  const deleteDoctor = useDeleteDoctor();
  const [deleteTargetDoctor, setDeleteTargetDoctor] = useState<{ id: string; name: string } | null>(null);

  const confirmDeleteDoctor = async () => {
    if (!deleteTargetDoctor) return;
    try {
      await deleteDoctor.mutateAsync(deleteTargetDoctor.id);
      toast.success(`Doctor ${deleteTargetDoctor.name} removed successfully!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to remove doctor");
    } finally {
      setDeleteTargetDoctor(null);
    }
  };

  const columns: Column<Doctor>[] = [
    {
      header: "Doctor & Identification",
      render: (d) => (
        <div className="flex items-center gap-3">
          {d.photoUrl ? (
            <img src={d.photoUrl} alt={d.name} className="h-10 w-10 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 border border-emerald-200">
              {d.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-bold text-slate-900 leading-tight">{d.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                {d.licenseNo || (d as any).employeeId || "ID PENDING"}
              </span>
              <span className="text-xs text-slate-400 truncate max-w-[150px]">{d.email}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Department & Specialty",
      render: (d) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block">
            {typeof d.department === "object" && d.department ? d.department.name : "General Medicine"}
          </span>
          <span className="text-[11px] text-slate-500">
            {d.specialization || "Clinical Consultant"}
          </span>
        </div>
      ),
    },
    {
      header: "Qualification",
      render: (d) => <span className="text-xs text-slate-700 font-medium">{d.qualification || "MBBS"}</span>,
    },
    {
      header: "Contact",
      render: (d) => <span className="text-xs text-slate-700 font-mono">{d.phone || "—"}</span>,
    },
    {
      header: "Duty Status",
      render: (d) => <Badge tone={STATUS_TONE[d.status]}>{(d.status || "on_duty").replace("_", " ").toUpperCase()}</Badge>,
    },
    {
      header: "Actions",
      render: (d) => (
        <div className="flex items-center gap-2 text-slate-400">
          <Link
            to={`/admin/doctors/${d._id}`}
            className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-emerald-700 transition-colors"
            title="View Doctor Profile"
          >
            <Eye className="h-4 w-4" />
          </Link>
          {!isAllBranches ? (
            <>
              <Link
                to={`/admin/doctors/${d._id}/edit`}
                className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-emerald-700 transition-colors"
                title="Edit Doctor"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setDeleteTargetDoctor({ id: d._id, name: d.name })}
                className="rounded-lg p-1.5 hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition-colors"
                title="Remove Doctor"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className="p-1.5 text-slate-300 cursor-not-allowed" title="Switch to a specific branch to edit or remove doctors">
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

      {/* Header with Title and Integrated Telemetry Summary Chips (replaces KPI card grid) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Doctor Directory</h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
              Clinical Registry
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage attending specialists, uniquely coded medical identifiers & duty schedules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Integrated Telemetry Summary Chips */}
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            <Stethoscope className="h-3.5 w-3.5 text-emerald-700" />
            <span>Total Doctors: <strong>{data?.counts.total ?? 0}</strong></span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            <span>On Duty: <strong>{data?.counts.onDuty ?? 0}</strong></span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-semibold text-amber-800">
            <CalendarOff className="h-3.5 w-3.5 text-amber-600" />
            <span>On Leave: <strong>{data?.counts.onLeave ?? 0}</strong></span>
          </span>

          {!isAllBranches ? (
            <Link to="/admin/doctors/new" className="shrink-0">
              <Button variant="primary" size="sm" className="gap-1.5 font-bold shadow-xs">
                <UserPlus className="h-4 w-4" /> Add Doctor
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
              title="Switch to a specific branch to add doctors"
            >
              <UserPlus className="h-4 w-4" /> Add Doctor (Read Only)
            </Button>
          )}
        </div>
      </div>

      {/* Main Directory Table with Filter Bar */}
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
              placeholder="Search by doctor name or ID..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments?.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="on_duty">On Duty</option>
              <option value="on_leave">On Leave</option>
              <option value="off_duty">Off Duty</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(d) => d._id}
          emptyMessage={isLoading ? "Loading doctor records..." : "No doctors found matching filters."}
        />

        <div className="mt-4 flex justify-between items-center border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">
            Showing Page <strong>{page}</strong> of <strong>{data?.pagination.totalPages ?? 1}</strong>
          </span>
          <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </Card>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetDoctor)}
        title="Confirm Doctor Removal"
        message={`Are you sure you want to remove ${deleteTargetDoctor?.name || "this doctor"} from hospital registry? This action cannot be undone.`}
        isLoading={deleteDoctor.isPending}
        onClose={() => setDeleteTargetDoctor(null)}
        onConfirm={confirmDeleteDoctor}
      />
    </div>
  );
}
