import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Download, Network, Users, Pencil, Trash2 } from "lucide-react";
import { useBranches, useDeleteBranch } from "../../features/branches";
import { useExportReport } from "../../features/reports";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import toast from "react-hot-toast";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { Branch } from "../../types/domain";

const STATUS_TONE: Record<Branch["status"], "success" | "warning" | "danger" | "neutral"> = {
  active: "success",
  on_leave: "warning",
  critical: "danger",
  inactive: "neutral",
};

export function BranchesPage() {
  const [searchParams] = useSearchParams();
  const hospitalId = searchParams.get("hospitalId") ?? undefined;
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBranches({ page, hospitalId });
  const deleteBranch = useDeleteBranch();
  const exportReport = useExportReport();
  const [deleteTargetBranch, setDeleteTargetBranch] = useState<{ id: string; name: string } | null>(null);

  const confirmDeleteBranch = async () => {
    if (!deleteTargetBranch) return;
    try {
      await deleteBranch.mutateAsync(deleteTargetBranch.id);
      toast.success(`Branch ${deleteTargetBranch.name} deleted successfully!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete branch");
    } finally {
      setDeleteTargetBranch(null);
    }
  };

  const columns: Column<Branch>[] = [
    {
      header: "Branch Name",
      render: (b) => (
        <div>
          <span className="font-semibold text-slate-800">{b.name}</span>
          {b.branchId && <div className="text-xs text-slate-400 font-mono">ID: {b.branchId}</div>}
        </div>
      ),
    },
    { header: "Hospital", render: (b) => <span className="text-slate-600">{typeof b.hospital === "object" && b.hospital ? b.hospital.name : "Unassigned"}</span> },
    { header: "Branch Head", render: (b) => <span className="text-slate-600">{b.headName || "—"}</span> },
    { header: "Total Staff", render: (b) => <span className="font-semibold text-slate-700">{b.totalStaff}</span> },
    { header: "Location", render: (b) => <span className="text-slate-600">{[b.city, b.state].filter(Boolean).join(", ") || "—"}</span> },
    {
      header: "Status",
      render: (b) => <Badge tone={STATUS_TONE[b.status]}>{b.status.replace("_", " ")}</Badge>,
    },
    {
      header: "Actions",
      render: (b) => (
        <div className="flex items-center gap-2 text-slate-400">
          <Link to={`/super-admin/branches/${b._id}/edit`} className="hover:text-navy-700">
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setDeleteTargetBranch({ id: b._id, name: b.name })}
            className="hover:text-red-600 cursor-pointer"
            title="Delete Branch"
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Branch Management</h1>
          <p className="text-sm text-slate-500">Oversee and manage hospital branches across all operational regions.</p>
        </div>
        <Link to="/super-admin/branches/new" className="shrink-0">
          <Button variant="primary" className="w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Add Branch
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Total Branches" value={data?.summary.totalBranches ?? 0} icon={<Network className="h-5 w-5" />} emphasis />
        <KpiCard label="Total Staff" value={data?.summary.totalStaff ?? 0} icon={<Users className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Showing {data?.data.length ?? 0} of {data?.pagination.total ?? 0} results
          </span>
          <Button variant="secondary" onClick={() => exportReport.mutate("branches")} disabled={exportReport.isPending}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <DataTable columns={columns} rows={data?.data ?? []} rowKey={(b) => b._id} emptyMessage={isLoading ? "Loading..." : "No branches found."} />

        <div className="mt-4 flex justify-end">
          <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </Card>

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetBranch)}
        title="Confirm Deletion"
        message={`Are you sure you want to delete branch ${deleteTargetBranch?.name || ""}? This action cannot be undone.`}
        isLoading={deleteBranch.isPending}
        onClose={() => setDeleteTargetBranch(null)}
        onConfirm={confirmDeleteBranch}
      />
    </div>
  );
}
