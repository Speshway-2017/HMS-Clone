import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  IndianRupee, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  Plus, 
  ClipboardCheck, 
  Pill, 
  Receipt,
  ArrowRight,
  TrendingDown
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Button } from "../../components/ui/Button";
import { useInventory } from "../../features/inventory";
import { useInvoices } from "../../features/invoices";
import { usePatients } from "../../features/patients";
import { usePrescriptions } from "../../features/doctorDashboard";

interface Medicine {
  _id: string;
  name: string;
  category: string;
  stockQty: number;
  reorderLevel: number;
  expiryDate: string;
  price: number;
  batchNo: string;
}

interface Prescription {
  _id: string;
  patientName: string;
  doctorName: string;
  medicines: string[];
  date: string;
  status: "Pending" | "Partially Dispensed" | "Dispensed" | "Completed" | "Cancelled" | "Approved" | "Rejected";
}

interface Sale {
  date: string;
  amount: number;
}

export function PharmacyDashboard() {
  const navigate = useNavigate();

  // Queries
  const { data: inventoryData, isLoading: isInventoryLoading } = useInventory({ category: "medicines", limit: 100 });
  const { data: invoiceData, isLoading: isInvoicesLoading } = useInvoices({ billingType: "PHARMACY", limit: 100 });
  const { data: patientData, isLoading: isPatientsLoading } = usePatients({});
  const { data: realPrescriptions, isLoading: isPrescriptionsLoading } = usePrescriptions();

  if (isInventoryLoading || isInvoicesLoading || isPatientsLoading || isPrescriptionsLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-slate-500 font-medium">Loading dashboard data...</div>
      </div>
    );
  }

  // 1. Medicines mapping
  const medicines: Medicine[] = (inventoryData?.data || []).map((item: any) => {
    const parts = item.description ? item.description.split(" | ") : [];
    const subcategory = parts[0] || "Analgesic";
    const expiryDate = parts[1] || "";
    return {
      _id: item._id,
      name: item.name,
      category: subcategory,
      stockQty: item.stockQty,
      reorderLevel: item.reorderLevel,
      expiryDate: expiryDate,
      price: item.unitCost,
      batchNo: item.storageCondition || "",
    };
  });

  // 2. Invoices mapping
  const invoices = invoiceData?.data || [];
  const today = new Date().toISOString().split("T")[0];
  const todayInvs = invoices.filter((inv: any) => {
    const invDate = new Date(inv.issuedAt || inv.createdAt).toISOString().split("T")[0];
    return invDate === today;
  });
  const todaySalesCount = todayInvs.length;
  const todayRevenue = todayInvs.reduce((acc: number, curr: any) => acc + (curr.totals?.total || curr.total || 0), 0);

  // 3. Recharts sales trend
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  }).reverse();
  const sales: Sale[] = last7Days.map(date => {
    const amount = invoices
      .filter((inv: any) => {
        const invDate = new Date(inv.issuedAt || inv.createdAt).toISOString().split("T")[0];
        return invDate === date && inv.status === "paid";
      })
      .reduce((sum: number, inv: any) => sum + (inv.totals?.total || inv.total || 0), 0);
    const displayDate = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { date: displayDate, amount };
  });

  // 4. Prescriptions mapping
  const prescriptions: Prescription[] = (realPrescriptions || []).map((rx: any) => ({
    _id: rx._id,
    patientName: rx.patient?.name || "Unknown Patient",
    doctorName: rx.doctor?.name || "Attending Physician",
    medicines: (rx.medications || []).map((m: any) => `${m.name}${m.strength ? ` (${m.strength})` : ""}`),
    date: new Date(rx.createdAt).toISOString().split("T")[0],
    status: rx.status as any,
  }));

  // Compute stats
  const lowStockCount = medicines.filter(med => med.stockQty <= med.reorderLevel).length;
  const expiringCount = medicines.filter(med => {
    const exp = new Date(med.expiryDate);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return exp <= threeMonthsFromNow;
  }).length;

  const pendingPrescriptionsCount = prescriptions.filter(p => p.status === "Pending").length;
  const pendingRequestsCount = prescriptions.filter(p => p.status === "Pending" || p.status === "Partially Dispensed" || p.status === "Dispensed").length;

  const lowStockMedicinesList = medicines
    .filter(med => med.stockQty <= med.reorderLevel)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacy Dashboard</h1>
          <p className="text-sm text-slate-500">Manage medicine inventory, prescriptions, and retail operations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 border border-green-200">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Pharmacy Operational
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard 
          label="Today's Sales" 
          value={todaySalesCount} 
          icon={<Receipt className="h-4 w-4" />} 
          trend={{ direction: "up", text: "from yesterday" }}
          emphasis
          to="/pharmacy/billing"
          size="sm"
        />
        <KpiCard 
          label="Today's Revenue" 
          value={`₹${todayRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={<IndianRupee className="h-4 w-4" />} 
          to="/pharmacy/analytics"
          size="sm"
        />
        <KpiCard 
          label="Pending Prescriptions" 
          value={pendingPrescriptionsCount} 
          icon={<FileText className="h-4 w-4" />} 
          trend={pendingPrescriptionsCount > 0 ? { direction: "up", text: "Action required" } : undefined}
          to="/pharmacy/prescriptions"
          size="sm"
        />
        <KpiCard 
          label="Pending Requests" 
          value={pendingRequestsCount} 
          icon={<ClipboardCheck className="h-4 w-4" />} 
          trend={pendingRequestsCount > 0 ? { direction: "up", text: "Dispense queue" } : undefined}
          to="/pharmacy/dispensing"
          size="sm"
        />
        <KpiCard 
          label="Low Stock Alert" 
          value={lowStockCount} 
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />} 
          trend={lowStockCount > 0 ? { direction: "up", text: "Restock limit" } : undefined}
          to="/pharmacy/inventory"
          size="sm"
        />
        <KpiCard 
          label="Expiring (3 Months)" 
          value={expiringCount} 
          icon={<Calendar className="h-4 w-4" />} 
          to="/pharmacy/inventory"
          size="sm"
        />
      </div>

      {/* Analytics Chart and Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales Area Chart */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Sales Analytics</h3>
              <p className="text-xs text-slate-500">Weekly tracking of sales volume and billing revenue.</p>
            </div>
            <Link to="/pharmacy/analytics" className="text-xs font-semibold text-navy-700 hover:text-navy-800 flex items-center gap-1">
              View Analytics <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#1E40AF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                  formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="amount" stroke="#1E40AF" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick Actions Panel */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-800">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <button 
              onClick={() => navigate("/pharmacy/dispensing")}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Dispense Medicine</div>
                <div className="text-xs text-slate-500">Deliver approved orders to patient</div>
              </div>
            </button>

            <button 
              onClick={() => navigate("/pharmacy/prescriptions")}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-700">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Verify Prescriptions</div>
                <div className="text-xs text-slate-500">Approve or reject doctor prescriptions</div>
              </div>
            </button>

            <button 
              onClick={() => navigate("/pharmacy/billing")}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Generate Invoice</div>
                <div className="text-xs text-slate-500">Collect payment & issue bill receipts</div>
              </div>
            </button>

            <button 
              onClick={() => navigate("/pharmacy/inventory")}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Manage Inventory</div>
                <div className="text-xs text-slate-500">Add medicines, track batches/expiry</div>
              </div>
            </button>
          </div>
        </Card>
      </div>

      {/* Low Stock Alerts & Pending Prescriptions lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock Warnings */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Critical Stock Warnings</h3>
            <Link to="/pharmacy/inventory" className="text-xs font-semibold text-navy-700 hover:text-navy-800">
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {lowStockMedicinesList.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-400">All medicines are at optimal stock levels.</div>
            ) : (
              lowStockMedicinesList.map(med => (
                <div key={med._id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{med.name}</div>
                    <div className="text-xs text-slate-500">Category: {med.category} | Batch: {med.batchNo}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-600">{med.stockQty} Units Left</div>
                    <div className="text-xs text-slate-400">Reorder limit: {med.reorderLevel}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Pending Prescriptions List */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Recent Pending Prescriptions</h3>
            <Link to="/pharmacy/prescriptions" className="text-xs font-semibold text-navy-700 hover:text-navy-800">
              Go to Verification
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {prescriptions.filter(p => p.status === "Pending").slice(0, 4).length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-400">No prescriptions waiting for verification.</div>
            ) : (
              prescriptions.filter(p => p.status === "Pending").slice(0, 4).map(p => (
                <div key={p._id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{p.patientName}</div>
                    <div className="text-xs text-slate-500">Prescribed by {p.doctorName}</div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {p.medicines.length} Item(s)
                    </span>
                    <div className="text-xs text-slate-400 mt-1">{p.date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
