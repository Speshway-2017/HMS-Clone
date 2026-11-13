import { Link, useParams } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useInventoryItem } from "../../features/inventory";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

const STOCK_TONE = { critical: "danger", low: "warning", optimal: "success" } as const;

export function InventoryItemDetailsPage() {
  const { id } = useParams();
  const { data: item, isLoading } = useInventoryItem(id);

  if (isLoading || !item) {
    return <p className="text-slate-400">Loading...</p>;
  }

  const percentToMax = item.maxLevel > 0
    ? Math.min(100, Math.round((item.stockQty / item.maxLevel) * 100))
    : Math.min(100, Math.round((item.stockQty / Math.max(item.stockQty * 1.2, 100)) * 100));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">
            <Link to="/admin/inventory" className="hover:text-emerald-700">
              Inventory
            </Link>{" "}
            / {item.category} / {item.name}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">{item.name}</h1>
          <p className="text-sm text-slate-500">{item.description || "No description provided."}</p>
        </div>
        <Link to={`/admin/inventory/${id}/edit`}>
          <Button variant="secondary">
            <Pencil className="h-4 w-4" /> Edit Details
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Stock</span>
            <Badge tone={STOCK_TONE[item.stockStatus]}>{item.stockStatus}</Badge>
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {item.stockQty} <span className="text-base font-normal text-slate-400">{item.unit}</span>
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>Reorder Point: {item.reorderLevel}</span>
            <span>{percentToMax}% to Max</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-700" style={{ width: `${percentToMax}%` }} />
          </div>
        </Card>

        <Card>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-400">SKU ID</div>
              <div className="font-semibold text-slate-800">{item.sku}</div>
            </div>
            <div>
              <div className="text-slate-400">Category</div>
              <div className="font-semibold capitalize text-slate-800">{item.category}</div>
            </div>
            <div>
              <div className="text-slate-400">Storage</div>
              <div className="font-semibold text-slate-800">{item.storageCondition || "—"}</div>
            </div>
            <div>
              <div className="text-slate-400">Unit Cost</div>
              <div className="font-semibold text-slate-800">₹{item.unitCost.toFixed(2)}</div>
            </div>
          </div>
        </Card>

        <Card className="bg-emerald-700 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Supplier</p>
          <h3 className="mt-1 text-lg font-semibold">{item.supplier || "Not specified"}</h3>
        </Card>
      </div>
    </div>
  );
}
