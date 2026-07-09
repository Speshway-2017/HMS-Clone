import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { useHospitals, useDeleteHospital } from "../../features/hospitals";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Hospital } from "../../types/domain";

const STATUS_TABS = [
  { key: "all", label: "All Facilities" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

export function HospitalsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHospitals({ page, search, status });
  const deleteHospital = useDeleteHospital();

  const columns: Column<Hospital>[] = [
    {
      header: "Hospital Name",
      render: (h) => (
        <div>
          <div className="font-semibold text-slate-800">{h.name}</div>
          <div className="text-xs text-slate-400">Code: {h.code}</div>
        </div>
      ),
    },
    { header: "Address", render: (h) => <span className="text-slate-600">{h.address || "—"}</span> },
    { header: "Primary Admin", render: (h) => <span className="text-slate-600">{h.primaryAdminName ?? "Unassigned"}</span> },
    {
      header: "Status",
      render: (h) => <Badge tone={h.status === "active" ? "success" : "neutral"}>{h.status === "active" ? "Active" : "Inactive"}</Badge>,
    },
    {
      header: "Actions",
      render: (h) => (
        <div className="flex items-center gap-2 text-slate-400">
          <Link to={`/super-admin/hospitals/${h._id}`} className="hover:text-navy-700">
            <Eye className="h-4 w-4" />
          </Link>
          <Link to={`/super-admin/hospitals/${h._id}/edit`} className="hover:text-navy-700">
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={() => {
              if (confirm(`Delete ${h.name}? This cannot be undone.`)) {
                deleteHospital.mutate(h._id);
              }
            }}
            className="hover:text-red-600"
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
          <h1 className="text-2xl font-bold text-slate-900">Hospitals Registry</h1>
          <p className="text-sm text-slate-500">Manage and monitor health facility performance across the enterprise network.</p>
        </div>
        <Link to="/super-admin/hospitals/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" /> Add Hospital
          </Button>
        </Link>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search hospitals or codes..."
              className="w-56 text-sm outline-none"
            />
          </div>
          <div className="flex gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatus(tab.key);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  status === tab.key ? "bg-navy-50 text-navy-700" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {tab.label}
                {tab.key === "active" && data ? ` (${data.counts.active})` : ""}
                {tab.key === "inactive" && data ? ` (${data.counts.inactive})` : ""}
                {tab.key === "all" && data ? ` (${data.counts.total})` : ""}
              </button>
            ))}
          </div>
        </div>

        <DataTable columns={columns} rows={data?.data ?? []} rowKey={(h) => h._id} emptyMessage={isLoading ? "Loading..." : "No hospitals found."} />

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Showing {data?.data.length ?? 0} of {data?.pagination.total ?? 0} facilities
          </span>
          <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
