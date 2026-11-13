import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  TrendingUp,
  CreditCard,
  Calendar,
  Receipt,
  Plus,
  ExternalLink,
  ChevronRight,
  Globe,
  Network,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useGlobalAnalytics } from "../../features/analytics";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SuperAdminDashboard() {
  const { data, isLoading } = useGlobalAnalytics();
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("all");

  const hospitals = data?.hospitals.list || [];
  const sales = data?.sales;
  const salesByHospital = sales?.salesByHospital || [];
  const salesTrend = sales?.salesTrend || [];

  const selectedHospital = selectedHospitalId === "all" ? null : hospitals.find((h) => h._id === selectedHospitalId);

  return (
    <div className="space-y-5 sm:space-y-6 font-sans">
      {/* ── Header Area ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Hospitals & Sales Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Network facility management and live sales revenue tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/super-admin/hospitals/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Hospital
          </Link>
          <Link
            to="/super-admin/branches"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Network className="h-3.5 w-3.5 text-slate-500" /> Branches
          </Link>
          <Link
            to="/super-admin/cms"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-600" /> Website CMS
          </Link>
        </div>
      </div>

      {/* ── Key Metrics (Only Hospitals & Sales) ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Total Hospitals"
          value={data?.hospitals.total ?? 0}
          icon={<Building2 className="h-4 w-4" />}
          subtitle={`${data?.hospitals.active ?? 0} active facilities`}
          to="/super-admin/hospitals"
        />

        <KpiCard
          label="Total Sales"
          value={formatCurrency(sales?.totalSales ?? 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          subtitle={`${sales?.totalInvoices ?? 0} invoices paid`}
        />

        <KpiCard
          label="Today's Sales"
          value={formatCurrency(sales?.todaySales ?? 0)}
          icon={<CreditCard className="h-4 w-4" />}
          subtitle="Collected today"
        />

        <KpiCard
          label="This Month's Sales"
          value={formatCurrency(sales?.thisMonthSales ?? 0)}
          icon={<Calendar className="h-4 w-4" />}
          subtitle="Current billing month"
        />

        <KpiCard
          label="Paid Invoices"
          value={sales?.totalInvoices ?? 0}
          icon={<Receipt className="h-4 w-4" />}
          subtitle="Total settled invoices"
        />
      </div>

      {/* ── Sales Charts (Simple & Clean) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Chart 1: Sales by Hospital */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-700" /> Sales Revenue by Hospital
              </h3>
              <p className="text-xs text-slate-500">Revenue collected across registered facilities.</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {hospitals.length} Hospitals
            </span>
          </div>

          <div className="h-60 sm:h-64">
            {salesByHospital.length === 0 || salesByHospital.every((h) => h.sales === 0) ? (
              <div className="flex h-full flex-col items-center justify-center text-xs text-slate-400 gap-1">
                <Receipt className="h-6 w-6 text-slate-300" />
                <span>No paid invoice sales recorded yet.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByHospital} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} interval={0} angle={-10} textAnchor="end" />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#475569" }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Sales"]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="sales" name="Sales Revenue" fill="#15803d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Chart 2: Recent Daily Sales Trend */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-700" /> Daily Sales Trend (Last 7 Days)
              </h3>
              <p className="text-xs text-slate-500">Daily sales collection volume over the past week.</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              7 Days
            </span>
          </div>

          <div className="h-60 sm:h-64">
            {salesTrend.length === 0 || salesTrend.every((d) => d.sales === 0) ? (
              <div className="flex h-full flex-col items-center justify-center text-xs text-slate-400 gap-1">
                <TrendingUp className="h-6 w-6 text-slate-300" />
                <span>No sales transactions in the last 7 days.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrend} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#475569" }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#475569" }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Sales"]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="sales" name="Daily Sales" fill="#0b3322" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* ── Hospitals & Sales Data Table ─────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden border border-slate-200">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-700" /> Hospitals Directory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Overview of registered facilities, branch counts, and revenue.
            </p>
          </div>
          <Link
            to="/super-admin/hospitals"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            Manage Hospitals <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2.5 px-3.5">Hospital Name</th>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-center">Branches</th>
                <th className="py-2.5 px-3 text-center">Paid Invoices</th>
                <th className="py-2.5 px-3 text-right">Total Sales</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {hospitals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="h-8 w-8 text-slate-300" />
                      <p className="font-medium text-slate-600">No hospitals registered yet</p>
                      <Link
                        to="/super-admin/hospitals/new"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" /> Register your first hospital
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                hospitals.map((h) => (
                  <tr key={h._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-xs font-bold shrink-0">
                          {h.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[200px]">{h.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {h.code}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      <span className="truncate max-w-[150px] inline-block">{h.address || "—"}</span>
                    </td>

                    <td className="py-3 px-3">
                      {h.status === "active" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center font-semibold text-slate-800">
                      {h.totalBranches}
                    </td>

                    <td className="py-3 px-3 text-center font-semibold text-slate-800">
                      {h.totalInvoices}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-emerald-800">
                      {formatCurrency(h.totalSales)}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/super-admin/hospitals/${h._id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Manage <ExternalLink className="h-3 w-3 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
