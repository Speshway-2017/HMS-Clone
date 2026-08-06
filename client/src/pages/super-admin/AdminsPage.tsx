import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, ShieldCheck, Users2, Building2, Pencil, Trash2 } from "lucide-react";
import { useAdmins, useDeleteAdmin } from "../../features/admins";
import { useHospitals } from "../../features/hospitals";
import { useGlobalAnalytics } from "../../features/analytics";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import toast from "react-hot-toast";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { Admin } from "../../types/domain";

export function AdminsPage() {
  const [page, setPage] = useState(1);
  const [hospitalId, setHospitalId] = useState("");
  const [role, setRole] = useState("");
  const { data, isLoading } = useAdmins({ page, hospitalId: hospitalId || undefined, role: role || undefined });
  const { data: hospitalsData } = useHospitals({ page: 1 });
  const { data: analytics } = useGlobalAnalytics();
  const deleteAdmin = useDeleteAdmin();
  const [deleteTargetAdmin, setDeleteTargetAdmin] = useState<{ id: string; name: string } | null>(null);

  const confirmDeleteAdmin = async () => {
    if (!deleteTargetAdmin) return;
    try {
      await deleteAdmin.mutateAsync(deleteTargetAdmin.id);
      toast.success(`Administrator ${deleteTargetAdmin.name} deleted successfully!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete administrator");
    } finally {
      setDeleteTargetAdmin(null);
    }
  };

  const columns: Column<Admin>[] = [
    {
      header: "Administrator Name",
      render: (a) => (
        <div>
          <div className="font-semibold text-slate-800">{a.name}</div>
          {a.employeeId && <div className="text-xs text-slate-400">ID: {a.employeeId}</div>}
        </div>
      ),
    },
    {
      header: "Primary Role",
      render: (a) => <Badge tone="info">{a.title || (a.role === "hospital_admin" ? "Hospital Admin" : "Accountant")}</Badge>,
    },
    { header: "Assigned Hospital", render: (a) => <span className="text-slate-600">{typeof a.hospital === "object" && a.hospital ? a.hospital.name : "Unassigned"}</span> },
    { header: "Email Address", render: (a) => <span className="text-slate-600">{a.email}</span> },
    {
      header: "Status",
      render: (a) => <Badge tone={a.status === "active" ? "success" : "neutral"}>{a.status === "active" ? "Active" : "Inactive"}</Badge>,
    },
    {
      header: "Actions",
      render: (a) => (
        <div className="flex items-center gap-2 text-slate-400">
          <Link to={`/super-admin/admins/${a._id}/edit`} className="hover:text-navy-700">
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setDeleteTargetAdmin({ id: a._id, name: a.name })}
            className="hover:text-red-600 cursor-pointer"
            title="Delete Administrator"
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
          <h1 className="text-2xl font-bold text-slate-900">System Administrators</h1>
          <p className="text-sm text-slate-500">Manage institutional access and organizational roles across the HMS network.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/super-admin/roles">
            <Button variant="secondary">
              <ShieldCheck className="h-4 w-4" /> Manage Roles
            </Button>
          </Link>
          <Link to="/super-admin/admins/new">
            <Button variant="primary">
              <UserPlus className="h-4 w-4" /> Add Admin
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Total Admins" value={data?.pagination.total ?? 0} icon={<Users2 className="h-5 w-5" />} />
        <KpiCard label="Active Hospitals" value={analytics?.counts.activeHospitals ?? 0} icon={<Building2 className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={hospitalId}
            onChange={(e) => {
              setHospitalId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Filter by Hospital</option>
            {hospitalsData?.data.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Filter by Role</option>
            <option value="hospital_admin">Hospital Admin</option>
            <option value="accountant">Accountant</option>
          </select>
          <span className="ml-auto self-center text-sm text-slate-500">
            Showing {data?.data.length ?? 0} of {data?.pagination.total ?? 0} admins
          </span>
        </div>

        <DataTable columns={columns} rows={data?.data ?? []} rowKey={(a) => a._id} emptyMessage={isLoading ? "Loading..." : "No admins found."} />

        <div className="mt-4 flex justify-end">
          <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </Card>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetAdmin)}
        title="Confirm Deletion"
        message={`Are you sure you want to delete administrator ${deleteTargetAdmin?.name || ""}? This action cannot be undone.`}
        isLoading={deleteAdmin.isPending}
        onClose={() => setDeleteTargetAdmin(null)}
        onConfirm={confirmDeleteAdmin}
      />
    </div>
  );
}
