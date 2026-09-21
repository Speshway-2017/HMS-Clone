import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, AlertTriangle, PackageCheck, IndianRupee } from "lucide-react";
import { useInventory } from "../../features/inventory";
import { useBranchContext } from "../../context/BranchContext";
import { AllBranchesNoticeBanner } from "../../components/common/AllBranchesNoticeBanner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { DataTable, Column } from "../../components/ui/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { InventoryItem } from "../../types/domain";

const STOCK_TONE: Record<InventoryItem["stockStatus"], "danger" | "warning" | "success"> = {
  critical: "danger",
  low: "warning",
  optimal: "success",
};

export function InventoryPage() {
  const { isAllBranches } = useBranchContext();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const { data, isLoading } = useInventory({ page, category: category || undefined });

  const columns: Column<InventoryItem>[] = [
    {
      header: "Item Name",
      render: (i) => (
        <Link to={`/admin/inventory/${i._id}`} className="hover:underline">
          <div className="font-semibold text-slate-800">{i.name}</div>
          <div className="text-xs text-slate-400">SKU: {i.sku}</div>
        </Link>
      ),
    },
    { header: "Category", render: (i) => <Badge tone="info">{i.category}</Badge> },
    {
      header: "Stock Level",
      render: (i) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full ${i.stockStatus === "critical" ? "bg-red-500" : i.stockStatus === "low" ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{
                width: `${
                  i.maxLevel > 0
                    ? Math.min(100, (i.stockQty / i.maxLevel) * 100)
                    : Math.min(100, (i.stockQty / Math.max(i.stockQty * 1.2, 100)) * 100)
                }%`
              }}
            />
          </div>
          <span className="text-sm text-slate-600">
            {i.stockQty} {i.unit}
          </span>
        </div>
      ),
    },
    { header: "Supplier", render: (i) => <span className="text-slate-600">{i.supplier || "—"}</span> },
    { header: "Status", render: (i) => <Badge tone={STOCK_TONE[i.stockStatus]}>{i.stockStatus}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <AllBranchesNoticeBanner />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time stock levels and reorder alerts.</p>
        </div>
        {!isAllBranches ? (
          <Link to="/admin/inventory/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </Link>
        ) : (
          <Button variant="outline" disabled className="opacity-60 cursor-not-allowed bg-slate-100 text-slate-400" title="Switch to a specific branch to add items">
            <Plus className="h-4 w-4" /> Add Item (Read Only)
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Critical Stock Alerts" value={data?.counts.critical ?? 0} icon={<AlertTriangle className="h-5 w-5" />} emphasis />
        <KpiCard label="Total Items" value={data?.counts.total ?? 0} icon={<PackageCheck className="h-5 w-5" />} />
        <KpiCard label="Total Inventory Value" value={`₹${(data?.counts.totalValue ?? 0).toLocaleString()}`} icon={<IndianRupee className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {["", "medicines", "equipment", "consumables"].map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${category === c ? "bg-navy-50 text-navy-700" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {c === "" ? "All" : c}
            </button>
          ))}
        </div>

        <DataTable columns={columns} rows={data?.data ?? []} rowKey={(i) => i._id} emptyMessage={isLoading ? "Loading..." : "No inventory items yet."} />

        <div className="mt-4 flex justify-end">
          <Pagination page={page} totalPages={data?.pagination.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
