import { Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp, Clock, FileWarning, ClipboardList,
  Receipt, Banknote, CreditCard, RefreshCw, Plus,
  IndianRupee, Activity, AlertCircle, ArrowUpRight,
  ArrowRight, Wallet, Building2, FlaskConical,
  Ambulance, CheckCircle2, XCircle, Timer, User, ShieldAlert,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useAccountantDashboard } from "../../features/accountantDashboard";
import { socket } from "../../lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { roundCurrency } from "../../lib/currency";
import { Badge } from "../../components/ui/Badge";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return roundCurrency(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtShort(n: number) {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

const BILLING_TYPE_LABEL: Record<string, string> = {
  OP: "Consultation", IP: "Inpatient", PHARMACY: "Pharmacy",
  LAB: "Laboratory", RADIOLOGY: "Radiology", EMERGENCY: "Emergency", OTHER: "Other",
};

const METHOD_COLORS: Record<string, string> = {
  Cash: "#10b981", UPI: "#6366f1", Card: "#f59e0b",
  "Net Banking": "#3b82f6", Cheque: "#8b5cf6",
};

const BILLING_COLORS: Record<string, string> = {
  OP: "#1e3a8a", IP: "#0891b2", PHARMACY: "#059669",
  LAB: "#d97706", RADIOLOGY: "#7c3aed", EMERGENCY: "#dc2626", OTHER: "#6b7280",
};

const CLAIMS_COLORS: Record<string, string> = {
  "Pending Verification": "#f59e0b",
  Approved: "#3b82f6",
  Settled: "#10b981",
  Rejected: "#ef4444",
};

const CAT_COLORS: Record<string, string> = {
  Utilities: "bg-blue-100 text-blue-700",
  "Rent/Lease": "bg-indigo-100 text-indigo-700",
  "Medical Supplies": "bg-teal-100 text-teal-700",
  "Equipment Maintenance": "bg-amber-100 text-amber-700",
  Salaries: "bg-emerald-100 text-emerald-700",
  "Admin Expenses": "bg-purple-100 text-purple-700",
  "Vendor Payments": "bg-rose-100 text-rose-700"
};

const PIE_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#3b82f6", "#8b5cf6", "#dc2626", "#6b7280"];

// ── Skeleton loader ───────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
  );
}

function KpiSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// ── Stat tile ──────────────────────────────────────────────────────────────────

function StatTile({
  label, value, sub, icon, tone = "default", to,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; tone?: "success" | "warning" | "danger" | "info" | "default"; to?: string;
}) {
  const toneClass = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-sky-50 text-sky-700",
    default: "bg-navy-50 text-navy-700",
  }[tone];

  const inner = (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-navy-300 hover:shadow-sm transition group h-full">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 truncate">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 truncate">{sub}</p>}
      </div>
    </div>
  );

  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}

// ── Collection cell ────────────────────────────────────────────────────────────

function CollCell({
  label, value, highlight = false, warn = false,
}: { label: string; value: number; highlight?: boolean; warn?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${warn ? "bg-amber-50 border-amber-200" : highlight ? "bg-navy-55 border-navy-200 text-white" : "bg-white border-slate-200"}`}>
      <span className={`block uppercase text-[9px] leading-tight mb-1 tracking-wide font-semibold ${highlight ? "text-navy-200" : "text-slate-400"}`}>{label}</span>
      <span className={`text-sm font-bold font-mono ${warn ? "text-amber-700" : highlight ? "text-white" : "text-slate-800"}`}>
        ₹{fmt(value)}
      </span>
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <AlertCircle className="h-12 w-12 text-red-400" />
      <div>
        <p className="text-lg font-semibold text-slate-700">Failed to load dashboard</p>
        <p className="text-sm text-slate-500 mt-1">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition"
      >
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useAccountantDashboard();

  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live seconds-since-last-update counter
  useEffect(() => {
    const tick = setInterval(() => {
      if (dataUpdatedAt) {
        setSecondsAgo(Math.floor((Date.now() - dataUpdatedAt) / 1000));
      }
    }, 5000);
    return () => clearInterval(tick);
  }, [dataUpdatedAt]);

  // Socket-driven invalidation: refresh KPI on any billing/payment event
  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["accountant-dashboard"] });
    };
    const events = [
      "dashboard_update", "billing_updated", "prescription:dispensed",
      "ip_billing_update", "ip_bill_update", "payment_received",
      "expense_added", "expense_deleted", "expense_approved",
      "claim_verified", "claim_settled",
    ];
    events.forEach((e) => socket.on(e, invalidate));
    return () => events.forEach((e) => socket.off(e, invalidate));
  }, [queryClient]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setSecondsAgo(0);
    setIsRefreshing(false);
  }, [refetch]);

  const formatAgo = (secs: number) => {
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  };

  if (isError) {
    const msg = (error as any)?.response?.data?.message ?? (error as any)?.message ?? "Unknown error";
    return <ErrorState message={msg} onRetry={handleRefresh} />;
  }

  const kpi = data?.kpi;
  const today = data?.today;
  const summary = data?.invoiceSummary;
  const charts = data?.charts;
  const transactions = data?.recentTransactions ?? [];
  const expenses = data?.recentExpenses ?? [];

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Overview</h1>
          <p className="text-sm text-slate-500">
            Real-time collections, outstanding bills, payroll, and hospital expenses.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-slate-400 font-mono hidden sm:block">
            {dataUpdatedAt ? `Updated ${formatAgo(secondsAgo)}` : "Connecting..."}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-650 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${(isLoading || isRefreshing) ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link to="/accountant/billing">
            <button className="flex items-center gap-1.5 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-800 transition">
              <Plus className="h-4 w-4" /> New Invoice
            </button>
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            {/* 1. Total Revenue */}
            <div className="bg-navy-700 text-white rounded-xl p-5 space-y-1 shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-navy-200">Total Revenue (Paid)</span>
                <TrendingUp className="h-5 w-5 text-navy-300" />
              </div>
              <p className="text-2xl font-bold">₹{fmt(kpi?.netRevenue ?? 0)}</p>
              <p className="text-xs text-navy-300">{kpi?.paidCount ?? 0} invoices paid</p>
            </div>

            {/* 2. Pending Payments */}
            <Link to="/accountant/billing" className="bg-white border border-slate-200 rounded-xl p-5 space-y-1 hover:border-navy-300 hover:shadow-sm transition block text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Payments</span>
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">₹{fmt(kpi?.outstandingAmount ?? 0)}</p>
              <p className="text-xs text-amber-600">
                {kpi?.pendingCount ?? 0} invoice{(kpi?.pendingCount ?? 0) !== 1 ? "s" : ""} outstanding
              </p>
            </Link>

            {/* 3. Pending Insurance Claims */}
            <Link to="/accountant/claims" className="bg-white border border-slate-200 rounded-xl p-5 space-y-1 hover:border-navy-300 hover:shadow-sm transition block text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending Claims</span>
                <ShieldAlert className="h-5 w-5 text-sky-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{kpi?.pendingClaimsCount ?? 0} Claims</p>
              <p className="text-xs text-sky-600">Est: ₹{kpi?.pendingClaimsValue?.toLocaleString("en-IN") ?? "0.00"}</p>
            </Link>

            {/* 4. Monthly Expenses */}
            <Link to="/accountant/expenses" className="bg-white border border-slate-200 rounded-xl p-5 space-y-1 hover:border-navy-300 hover:shadow-sm transition block text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly Expenses</span>
                <ClipboardList className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">₹{fmt(kpi?.monthlyExpenses ?? 0)}</p>
              <p className="text-xs text-red-500">Calculated from expense logs</p>
            </Link>
          </>
        )}
      </div>

      {/* ── Today's Live Collections ────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-navy-700" />
            Today's Live Collections (₹)
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <>
            {/* Revenue by type */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <CollCell label="Total Collection" value={today?.totalCollection ?? 0} highlight />
              <CollCell label="Consultation" value={today?.consultationRevenue ?? 0} />
              <CollCell label="Pharmacy" value={today?.pharmacyRevenue ?? 0} />
              <CollCell label="Laboratory" value={today?.labRevenue ?? 0} />
              <CollCell label="IP Billing" value={today?.ipRevenue ?? 0} />
            </div>
            {/* Payment methods */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <CollCell label="Cash" value={today?.cash ?? 0} />
              <CollCell label="UPI" value={today?.upi ?? 0} />
              <CollCell label="Card" value={today?.card ?? 0} />
              <CollCell label="Net Banking" value={today?.netBanking ?? 0} />
              <CollCell
                label="Outstanding Balance"
                value={kpi?.outstandingAmount ?? 0}
                warn={(kpi?.outstandingAmount ?? 0) > 0}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Invoice Summary Grid ────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-navy-700" />
          Invoice Summary
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : (
            <>
              <StatTile label="OP Invoices" value={summary?.op ?? 0} icon={<Receipt className="h-4 w-4" />} to="/accountant/billing" />
              <StatTile label="IP Invoices" value={summary?.ip ?? 0} icon={<Building2 className="h-4 w-4" />} tone="info" to="/accountant/billing" />
              <StatTile label="Pharmacy" value={summary?.pharmacy ?? 0} icon={<Wallet className="h-4 w-4" />} tone="success" to="/accountant/billing" />
              <StatTile label="Laboratory" value={summary?.lab ?? 0} icon={<FlaskConical className="h-4 w-4" />} tone="warning" to="/accountant/billing" />
              <StatTile label="Radiology" value={summary?.radiology ?? 0} icon={<Activity className="h-4 w-4" />} to="/accountant/billing" />
              <StatTile label="Paid" value={summary?.paid ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
              <StatTile label="Pending" value={summary?.pending ?? 0} icon={<Clock className="h-4 w-4" />} tone="warning" to="/accountant/billing" />
              <StatTile label="Partially Paid" value={summary?.partiallyPaid ?? 0} icon={<Timer className="h-4 w-4" />} tone="info" />
              <StatTile label="Cancelled" value={summary?.cancelled ?? 0} icon={<XCircle className="h-4 w-4" />} tone="danger" />
              <StatTile label="Emergency" value={summary?.emergency ?? 0} icon={<Ambulance className="h-4 w-4" />} tone="danger" />
            </>
          )}
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* 7-Day Revenue Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Revenue — Last 7 Days</h3>
          <p className="text-xs text-slate-400 mb-4">Total daily collections (OP + IP)</p>
          {isLoading ? (
            <Skeleton className="h-60" />
          ) : (charts?.daily?.length ?? 0) === 0 ? (
            <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
              No payment data in the last 7 days.
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.daily} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={fmtShort} />
                  <Tooltip
                    formatter={(v: number) => [`₹${fmt(v)}`, "Revenue"]}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="revenue" fill="#1e3a8a" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Payment Method Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Payment Methods</h3>
          <p className="text-xs text-slate-400 mb-4">All-time collection distribution</p>
          {isLoading ? (
            <Skeleton className="h-60" />
          ) : (charts?.paymentMethodDistribution?.length ?? 0) === 0 ? (
            <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
              No payment data yet.
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts?.paymentMethodDistribution}
                    dataKey="amount"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {charts?.paymentMethodDistribution?.map((entry, i) => (
                      <Cell
                        key={entry.method}
                        fill={METHOD_COLORS[entry.method] ?? PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`₹${fmt(v)}`]} />
                  <Legend
                    formatter={(value) => <span className="text-xs text-slate-650 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* ── Second Row of Charts ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Insurance Claims Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Insurance Claim Statuses</h3>
          <p className="text-xs text-slate-400 mb-4">Volume of claims by verification status</p>
          {isLoading ? (
            <Skeleton className="h-60" />
          ) : (charts?.claimsStatusDistribution?.length ?? 0) === 0 ? (
            <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
              No claims logged in the database.
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts?.claimsStatusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                  >
                    {charts?.claimsStatusDistribution?.map((entry: any) => (
                      <Cell
                        key={entry.status}
                        fill={CLAIMS_COLORS[entry.status] ?? PIE_COLORS[Math.floor(Math.random() * 5)]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} Claims`]} />
                  <Legend
                    formatter={(value) => <span className="text-xs text-slate-650 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Expenses by Category Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Expense Distribution Trend</h3>
          <p className="text-xs text-slate-400 mb-4">Operational costs split by category</p>
          {isLoading ? (
            <Skeleton className="h-60" />
          ) : (charts?.expenseCategoryDistribution?.length ?? 0) === 0 ? (
            <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
              No paid expenses found.
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.expenseCategoryDistribution} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 9, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={fmtShort} />
                  <Tooltip formatter={(v: number) => [`₹${fmt(v)}`, "Spent"]} />
                  <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* Monthly Revenue Trend */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Monthly Revenue — Last 7 Months</h3>
        <p className="text-xs text-slate-400 mb-4">Aggregated collections by month</p>
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (charts?.monthly?.length ?? 0) === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
            No monthly data available.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.monthly} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={fmtShort} />
                <Tooltip formatter={(v: number) => [`₹${fmt(v)}`, "Revenue"]} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1e3a8a"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#1e3a8a" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Billing Type Distribution */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Revenue by Billing Type</h3>
        <p className="text-xs text-slate-400 mb-4">Category-wise billing summaries</p>
        {isLoading ? (
          <Skeleton className="h-52" />
        ) : (charts?.billingTypeDistribution?.length ?? 0) === 0 ? (
          <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
            No billing type data available.
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts?.billingTypeDistribution?.map((d) => ({
                  ...d,
                  label: BILLING_TYPE_LABEL[d.type] ?? d.type,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 60, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={fmtShort} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} width={58} />
                <Tooltip formatter={(v: number) => [`₹${fmt(v)}`, "Revenue"]} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {charts?.billingTypeDistribution?.map((entry, i) => (
                    <Cell
                      key={entry.type}
                      fill={BILLING_COLORS[entry.type] ?? PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Recent Transactions ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Recent Payments</h3>
            <p className="text-xs text-slate-500">Latest payment transactions from all billing channels</p>
          </div>
          <Link to="/accountant/payments" className="text-xs font-semibold text-navy-700 hover:underline flex items-center gap-0.5">
            View All Payments <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[900px]">
            <thead className="bg-slate-50">
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Invoice / Txn Number</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">Billing Type</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Amount Paid</th>
                <th className="px-4 py-3">Collected By</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No payment transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-650 font-semibold">
                      {t.invoiceRef?.toUpperCase() || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 text-xs">{t.patientName || "—"}</div>
                      {t.patientUhid && t.patientUhid !== "—" && (
                        <div className="text-[10px] text-slate-400 font-mono">{t.patientUhid}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${BILLING_COLORS[t.billingType] ?? "#6b7280"}18`,
                          color: BILLING_COLORS[t.billingType] ?? "#6b7280",
                        }}
                      >
                        {BILLING_TYPE_LABEL[t.billingType] ?? t.billingType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${METHOD_COLORS[t.paymentMethod] ?? "#6b7280"}18`,
                          color: METHOD_COLORS[t.paymentMethod] ?? "#6b7280",
                        }}
                      >
                        {t.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-850">₹{fmt(t.amount)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {t.collectedBy}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(t.paidAt).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Expenses Table ───────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Recent Expense Logs</h3>
            <p className="text-xs text-slate-500">Latest recorded hospital operational and vendor payments</p>
          </div>
          <Link to="/accountant/expenses" className="text-xs font-semibold text-navy-700 hover:underline flex items-center gap-0.5">
            View All Expenses <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[900px]">
            <thead className="bg-slate-50">
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Expense Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Created By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No expense logs recorded.
                  </td>
                </tr>
              ) : (
                expenses.map((e: any) => (
                  <tr key={e._id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${CAT_COLORS[e.category] || "bg-slate-100 text-slate-650"}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 truncate max-w-xs" title={e.description}>
                      {e.description || "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-850">₹{fmt(e.amount)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {e.createdBy?.name || "System"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={e.status === "Paid" ? "success" : "warning"}>
                        {e.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { to: "/accountant/billing", label: "Patient Billing", sub: "OP/IP/Lab invoices", icon: <Receipt className="h-5 w-5" />, color: "bg-navy-50 text-navy-700" },
          { to: "/accountant/claims", label: "Insurance Claims", sub: "Verify & settle", icon: <FileWarning className="h-5 w-5" />, color: "bg-amber-50 text-amber-700" },
          { to: "/accountant/payroll", label: "Payroll", sub: "Salaries & payslips", icon: <Banknote className="h-5 w-5" />, color: "bg-emerald-50 text-emerald-700" },
          { to: "/accountant/expenses", label: "Record Expense", sub: "Vendor & admin costs", icon: <ClipboardList className="h-5 w-5" />, color: "bg-red-50 text-red-700" },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 hover:border-navy-200 hover:shadow-sm transition group"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{item.label}</p>
              <p className="text-xs text-slate-500 truncate">{item.sub}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-navy-600 ml-auto shrink-0 transition" />
          </Link>
        ))}
      </div>
    </div>
  );
}
