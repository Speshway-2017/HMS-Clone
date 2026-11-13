import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, ShieldCheck, Users2, Pencil, Trash2 } from "lucide-react";
import { useAdmins, useDeleteAdmin } from "../../features/admins";
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
  const [role, setRole] = useState("");
  const { data, isLoading } = useAdmins({ page, role: role || undefined });
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
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            {a.avatarUrl ? (
              <img src={a.avatarUrl} alt={a.name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span>{a.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-xs sm:text-sm">{a.name}</div>
            <div className="text-[11px] text-slate-400">{a.title || "System Administrator"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Admin Unique ID",
      render: (a) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
          {a.employeeId || "—"}
        </span>
      ),
    },
    {
      header: "Role / Authority",
      render: (a) => (
        <Badge tone="info">
          {a.role === "admin" || a.role === "hospital_admin" ? "Administrator" : a.role}
        </Badge>
      ),
    },
    { header: "Email Address", render: (a) => <span className="text-slate-600 text-xs sm:text-sm">{a.email}</span> },
    { header: "Contact Number", render: (a) => <span className="text-slate-600 text-xs sm:text-sm font-mono">{a.phone || "—"}</span> },
    {
      header: "Status",
      render: (a) => <Badge tone={a.status === "active" ? "success" : "neutral"}>{a.status === "active" ? "Active" : "Inactive"}</Badge>,
    },
    {
      header: "Actions",
      render: (a) => (
        <div className="flex items-center gap-2 text-slate-400">
          <Link to={`/super-admin/admins/${a._id}/edit`} className="hover:text-emerald-700" title="Edit Profile">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">System Administrators</h1>
          <p className="text-sm text-slate-500">Manage institutional access and organizational roles across the HMS network.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <Link to="/super-admin/roles" className="flex-1 sm:flex-none">
            <Button variant="secondary" className="w-full sm:w-auto">
              <ShieldCheck className="h-4 w-4" /> Manage Roles
            </Button>
          </Link>
          <Link to="/super-admin/admins/new" className="flex-1 sm:flex-none">
            <Button variant="primary" className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4" /> Add Admin
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Total Administrators" value={data?.pagination.total ?? 0} icon={<Users2 className="h-5 w-5" />} />
        <KpiCard label="Active Status" value={data?.data.filter((a) => a.status === "active").length ?? 0} icon={<ShieldCheck className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white"
          >
            <option value="">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="hospital_admin">Hospital Admin</option>
            <option value="accountant">Accountant</option>
          </select>
          <span className="ml-auto self-center text-xs text-slate-500">
            Showing {data?.data.length ?? 0} of {data?.pagination.total ?? 0} administrators
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
