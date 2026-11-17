import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Calendar, PackageCheck, AlertTriangle, ShieldCheck } from "lucide-react";
import { useInventoryItem } from "../../features/inventory";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

const STOCK_TONE = { critical: "danger", low: "warning", optimal: "success" } as const;

export function InventoryItemDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: item, isLoading } = useInventoryItem(id);

  if (isLoading || !item) {
    return (
      <div className="p-16 text-center text-slate-500 font-medium">
        Loading medicine details...
      </div>
    );
  }

  const parts = item.description ? item.description.split(" | ") : [];
  const subcategory = parts[0] || item.category || "General";
  const expiryDate = parts[1] || "";

  let daysUntilExpiry: number | null = null;
  let expiryStatus: "expired" | "expiring_soon" | "safe" | "unknown" = "unknown";

  if (expiryDate) {
    const exp = new Date(expiryDate);
    if (!isNaN(exp.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      exp.setHours(0, 0, 0, 0);
      daysUntilExpiry = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 0) expiryStatus = "expired";
      else if (daysUntilExpiry <= 60) expiryStatus = "expiring_soon";
      else expiryStatus = "safe";
    }
  }

  const percentToMax = item.maxLevel > 0
    ? Math.min(100, Math.round((item.stockQty / item.maxLevel) * 100))
    : Math.min(100, Math.round((item.stockQty / Math.max(item.stockQty * 1.2, 100)) * 100));

  return (
    <div className="space-y-6 w-full pb-16 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-emerald-700 transition">Dashboard</Link>
            <span>/</span>
            <Link to="/admin/inventory" className="hover:text-emerald-700 transition">Pharmacy Inventory</Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">{item.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              {item.name}
              {item.strength && (
                <span className="text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                  {item.strength}
                </span>
              )}
            </h1>
            <Badge tone="neutral">Admin Read-Only</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Category: <strong className="text-slate-700">{subcategory}</strong> • SKU: <span className="font-mono">{item.sku}</span>
          </p>
        </div>

        <Button variant="secondary" onClick={() => navigate("/admin/inventory")}>
          <ArrowLeft className="h-4 w-4" /> Back to Pharmacy Inventory
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Stock Level Card */}
        <Card className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-emerald-700" /> Stock Level
            </span>
            <Badge tone={STOCK_TONE[item.stockStatus]}>{item.stockStatus.toUpperCase()}</Badge>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {item.stockQty} <span className="text-sm font-medium text-slate-400">{item.unit || "units"}</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-500 pt-1">
            <div className="flex justify-between">
              <span>Reorder Minimum Threshold:</span>
              <strong className="text-slate-800">{item.reorderLevel} {item.unit}</strong>
            </div>
            <div className="flex justify-between">
              <span>Maximum Target Stock:</span>
              <strong className="text-slate-800">{item.maxLevel || "—"}</strong>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-2 rounded-full ${item.stockStatus === "critical" ? "bg-rose-500" : item.stockStatus === "low" ? "bg-amber-500" : "bg-emerald-600"}`}
              style={{ width: `${percentToMax}%` }}
            />
          </div>
        </Card>

        {/* Expiry & Batch Card */}
        <Card className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-700" /> Expiry & Batch
            </span>
            {expiryStatus === "expired" ? (
              <Badge tone="danger">EXPIRED</Badge>
            ) : expiryStatus === "expiring_soon" ? (
              <Badge tone="warning">EXPIRING SOON</Badge>
            ) : (
              <Badge tone="success">ACTIVE</Badge>
            )}
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Expiration Date:</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {expiryDate || "Not recorded"}
              </span>
            </div>
            {daysUntilExpiry !== null && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Remaining Shelf Life:</span>
                <span className={`font-bold ${daysUntilExpiry <= 0 ? "text-rose-600" : daysUntilExpiry <= 60 ? "text-amber-600" : "text-emerald-700"}`}>
                  {daysUntilExpiry <= 0 ? `Expired ${Math.abs(daysUntilExpiry)} days ago` : `${daysUntilExpiry} days remaining`}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Batch / Lot #:</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                {item.storageCondition || "—"}
              </span>
            </div>
          </div>
        </Card>

        {/* Commercial & Supplier Card */}
        <Card className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-700" /> Pricing & Supplier
            </span>
            <span className="text-xs font-bold text-slate-400">Retail Unit</span>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Unit Retail Price:</span>
              <span className="font-bold font-mono text-lg text-emerald-900">
                ₹{item.unitCost ? item.unitCost.toLocaleString() : "0.00"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Primary Supplier:</span>
              <strong className="text-slate-900">{item.supplier || "Not specified"}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Category Type:</span>
              <Badge tone="info">{subcategory}</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
