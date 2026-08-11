import { useMemo } from "react";
import { Wallet } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartCard } from "../ui/ChartCard";
import { formatINR } from "../../lib/currency";

interface RevenueAnalyticsSectionProps {
  invoices: any[];
  hospitalCounts?: any;
}

const BILLING_COLORS = ["#2563eb", "#9333ea", "#059669", "#d97706", "#0284c7", "#e11d48"];

export function RevenueAnalyticsSection({ invoices, hospitalCounts }: RevenueAnalyticsSectionProps) {
  const metrics = useMemo(() => {
    let todaysRev = 0;
    let monthlyRev = 0;
    let yearlyRev = 0;
    let pendingAmount = 0;
    let paidBillsCount = 0;
    let pendingBillsCount = 0;
    let refunds = 0;

    const todayStr = new Date().toISOString().split("T")[0];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const billingTypeMap = new Map<string, number>();

    invoices.forEach((inv) => {
      const invTotal = inv.totals?.total || 0;
      const invPaid = inv.totals?.totalPaid || (inv.status === "paid" ? invTotal : 0);
      const invBal = inv.totals?.patientBalance || (inv.status === "pending" ? invTotal : 0);

      const created = new Date(inv.issuedAt || inv.createdAt || Date.now());

      if (created.toISOString().split("T")[0] === todayStr) {
        todaysRev += invPaid;
      }
      if (created >= startOfMonth) {
        monthlyRev += invPaid;
      }
      if (created >= startOfYear) {
        yearlyRev += invPaid;
      }

      pendingAmount += invBal;

      if (inv.status === "paid") paidBillsCount++;
      else pendingBillsCount++;

      if (inv.refundedAmount || inv.status === "refunded") {
        refunds += inv.refundedAmount || invTotal;
      }

      // Billing type distribution
      const bType = inv.billingType || "Consultation";
      billingTypeMap.set(bType, (billingTypeMap.get(bType) || 0) + invTotal);
    });

    // Fallback to backend aggregated counts if invoices array is empty
    if (yearlyRev === 0 && hospitalCounts?.totalRevenue && hospitalCounts.totalRevenue > 0) {
      yearlyRev = hospitalCounts.totalRevenue;
      if (monthlyRev === 0) monthlyRev = hospitalCounts.totalRevenue;
    }

    const billingTypeData = Array.from(billingTypeMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    // Monthly revenue trend (Area Chart)
    const monthBuckets: { [key: string]: number } = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      monthBuckets[label] = 0;
    }

    invoices.forEach((inv) => {
      const created = new Date(inv.issuedAt || inv.createdAt || Date.now());
      const label = created.toLocaleString("default", { month: "short" });
      if (monthBuckets[label] !== undefined) {
        monthBuckets[label] += inv.totals?.totalPaid || (inv.status === "paid" ? (inv.totals?.total || 0) : 0);
      }
    });

    const revenueTrend = Object.keys(monthBuckets).map((month) => ({
      month,
      revenue: monthBuckets[month],
    }));

    return {
      todaysRev,
      monthlyRev,
      yearlyRev,
      pendingAmount,
      paidBillsCount,
      pendingBillsCount,
      refunds,
      billingTypeData,
      revenueTrend,
    };
  }, [invoices, hospitalCounts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Revenue & Financial Analytics</h3>
            <p className="text-xs text-slate-500">Live revenue collections, outstanding balances, refunds & billing types</p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Today's Revenue">Today's Revenue</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{formatINR(metrics.todaysRev)}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Collections Today</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Monthly Revenue">Monthly Revenue</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-600">{formatINR(metrics.monthlyRev)}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Current Month Total</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Yearly Revenue">Yearly Revenue</p>
          <p className="mt-2 text-2xl font-extrabold text-navy-900">{formatINR(metrics.yearlyRev)}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">YTD Paid Collections</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Outstanding Amount">Outstanding Amount</p>
          <p className="mt-2 text-2xl font-extrabold text-red-600">{formatINR(metrics.pendingAmount)}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Uncollected Balances</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Paid vs Pending Bills">Paid vs Pending Bills</p>
          <p className="mt-2 text-2xl font-extrabold text-indigo-600">
            {metrics.paidBillsCount} / {metrics.pendingBillsCount}
          </p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Paid / Unpaid Invoices</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Total Refunds">Total Refunds</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">{formatINR(metrics.refunds)}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Processed Refunds</span>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Trend Area Chart */}
        <div className="lg:col-span-2">
          <ChartCard title="Revenue Growth & Collections Trajectory" subtitle="Paid revenue collections over time">
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", color: "#fff", fontSize: "12px" }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#fff", fontWeight: 600 }} formatter={(value: any) => [formatINR(value), "Amount"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" name="Collections" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Revenue by Billing Type (Doughnut Chart) */}
        <ChartCard title="Revenue by Billing Type" subtitle="OP, IP, Pharmacy, Lab, Radiology share">
          <div className="h-64 w-full flex items-center justify-center">
            {metrics.billingTypeData.length === 0 ? (
              <p className="text-xs text-slate-400">No invoices recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={metrics.billingTypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {metrics.billingTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={BILLING_COLORS[index % BILLING_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", color: "#fff", fontSize: "12px" }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#fff", fontWeight: 600 }} formatter={(value: any) => [formatINR(value), "Billed Gross"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold">
            {metrics.billingTypeData.map((b, idx) => (
              <div key={b.name} className="flex items-center gap-1.5 truncate">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: BILLING_COLORS[idx % BILLING_COLORS.length] }} />
                <span className="text-slate-600 truncate">{b.name}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
