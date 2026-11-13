import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Stethoscope, Activity, CalendarOff, Pencil, Trash2, Eye } from "lucide-react";
import { useDoctors, useDeleteDoctor } from "../../features/doctors";
import { useDepartments } from "../../features/departments";
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
      header: "Doctor Name",
      render: (d) => (
        <div className="flex items-center gap-3">
          {d.photoUrl ? (
            <img src={d.photoUrl} alt={d.name} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
              {d.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-semibold text-slate-800">{d.name}</div>
            <div className="text-xs text-emerald-600">{d.email}</div>
          </div>
        </div>
      ),
    },
    { header: "Department", render: (d) => <span className="text-slate-600">{typeof d.department === "object" && d.department ? d.department.name : "—"}</span> },
    { header: "Qualification", render: (d) => <span className="text-slate-600">{d.qualification || "—"}</span> },
    { header: "Contact", render: (d) => <span className="text-slate-600">{d.phone || "—"}</span> },
    { header: "Status", render: (d) => <Badge tone={STATUS_TONE[d.status]}>{d.status.replace("_", " ")}</Badge> },
    {
      header: "Actions",
      render: (d) => (
        <div className="flex items-center gap-2 text-slate-400">
          <Link to={`/admin/doctors/${d._id}`} className="hover:text-emerald-700" title="View Doctor Profile">
            <Eye className="h-4 w-4" />
          </Link>
          {!isAllBranches ? (
            <>
              <Link to={`/admin/doctors/${d._id}/edit`} className="hover:text-emerald-700" title="Edit Doctor">
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setDeleteTargetDoctor({ id: d._id, name: d.name })}
                className="hover:text-red-600 cursor-pointer"
                title="Remove Doctor"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <span className="text-slate-300 cursor-not-allowed" title="Switch to a specific branch to edit or remove doctors">
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Doctor Directory</h1>
          <p className="text-sm text-slate-500">Manage medical professionals and their clinical status.</p>
        </div>
        {!isAllBranches ? (
          <Link to="/admin/doctors/new" className="shrink-0">
            <Button variant="primary" className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4" /> Add Doctor
            </Button>
          </Link>
        ) : (
          <Button
            variant="outline"
            disabled
            className="w-full sm:w-auto opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
            title="Switch to a specific branch to add doctors"
          >
            <UserPlus className="h-4 w-4" /> Add Doctor (Read Only)
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Doctors" value={data?.counts.total ?? 0} icon={<Stethoscope className="h-5 w-5" />} emphasis />
        <KpiCard label="On Duty" value={data?.counts.onDuty ?? 0} icon={<Activity className="h-5 w-5" />} />
        <KpiCard label="On Leave" value={data?.counts.onLeave ?? 0} icon={<CalendarOff className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="on_duty">On Duty</option>
            <option value="on_leave">On Leave</option>
            <option value="off_duty">Off Duty</option>
          </select>
        </div>

        <DataTable columns={columns} rows={data?.data ?? []} rowKey={(d) => d._id} emptyMessage={isLoading ? "Loading..." : "No doctors found."} />

        <div className="mt-4 flex justify-end">
          <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </Card>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetDoctor)}
        title="Confirm Deletion"
        message={`Are you sure you want to remove ${deleteTargetDoctor?.name || "this doctor"} from staff registry? This action cannot be undone.`}
        isLoading={deleteDoctor.isPending}
        onClose={() => setDeleteTargetDoctor(null)}
        onConfirm={confirmDeleteDoctor}
      />
    </div>
  );
}
