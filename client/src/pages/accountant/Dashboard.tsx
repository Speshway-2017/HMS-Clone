import { Link } from "react-router-dom";
import { 
  Receipt, 
  CreditCard, 
  FileWarning, 
  Banknote, 
  ClipboardList, 
  TrendingUp, 
  ArrowUpRight, 
  Clock,
  ArrowRight,
  Plus
} from "lucide-react";
import { useInvoices } from "../../features/invoices";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";
import { ChartCard } from "../../components/ui/ChartCard";
import { Badge } from "../../components/ui/Badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { useEffect, useState } from "react";

const STATUS_TONE = { 
  pending: "warning", 
  partially_paid: "info", 
  paid: "success", 
  overdue: "danger" 
} as const;

export function AccountantDashboard() {
  const { data: invoiceData, isLoading } = useInvoices({ page: 1 });
  
  // Local state for mocked payroll & expense totals to maintain interactive state
  const [expenseTotal, setExpenseTotal] = useState(128400);
  const [pendingClaimsCount, setPendingClaimsCount] = useState(18);
  const [claimsValue, setClaimsValue] = useState(385000);

  useEffect(() => {
    // Load local storage values if they exist
    const savedExpenses = localStorage.getItem("hms_expenses");
    if (savedExpenses) {
      try {
        const parsed = JSON.parse(savedExpenses);
        const sum = parsed.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
        setExpenseTotal(128400 + sum);
      } catch (e) {
        console.error(e);
      }
    }

    const savedClaims = localStorage.getItem("hms_claims");
    if (savedClaims) {
      try {
        const parsed = JSON.parse(savedClaims);
        const pending = parsed.filter((c: any) => c.status === "Pending Verification" || c.status === "Approved");
        setPendingClaimsCount(pending.length);
        const val = pending.reduce((acc: number, curr: any) => acc + (Number(curr.claimAmount) || 0), 0);
        setClaimsValue(val);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const counts = invoiceData?.counts;
  const recentInvoices = invoiceData?.data?.slice(0, 5) ?? [];

  // Monthly comparison data
  const revenueTrend = [
    { name: "Jan", Revenue: 450000, Expenses: 320000 },
    { name: "Feb", Revenue: 520000, Expenses: 340000 },
    { name: "Mar", Revenue: 490000, Expenses: 310000 },
    { name: "Apr", Revenue: 630000, Expenses: 380000 },
    { name: "May", Revenue: 580000, Expenses: 390000 },
    { name: "Jun", Revenue: 710000, Expenses: 420000 },
    { name: "Jul", Revenue: counts?.netRevenue ? counts.netRevenue + 120000 : 680000, Expenses: expenseTotal },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Overview</h1>
          <p className="text-sm text-slate-500">Real-time collections, outstanding bills, payroll, and hospital expenses.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/accountant/billing">
            <button className="flex items-center gap-1.5 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-800 transition">
              <Plus className="h-4 w-4" /> New Invoice
            </button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          label="Total Revenue (Paid)" 
          value={`₹${(counts?.netRevenue ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} 
          icon={<TrendingUp className="h-5 w-5" />} 
          emphasis 
          size="sm"
        />
        <KpiCard 
          label="Pending Payments" 
          value={`₹${((counts?.totalBilling ?? 0) - (counts?.netRevenue ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} 
          icon={<Clock className="h-5 w-5" />} 
          trend={{ direction: "down", text: `${counts?.pendingCount ?? 0} invoices outstanding` }}
          size="sm"
        />
        <KpiCard 
          label="Pending Claims" 
          value={`${pendingClaimsCount} Claims`} 
          icon={<FileWarning className="h-5 w-5" />} 
          trend={{ direction: "up", text: `Est: ₹${claimsValue.toLocaleString("en-IN")}` }}
          size="sm"
        />
        <KpiCard 
          label="Monthly Expenses" 
          value={`₹${expenseTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} 
          icon={<ClipboardList className="h-5 w-5" />} 
          size="sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Chart */}
        <div className="lg:col-span-2">
          <ChartCard title="Revenue vs Expenses Trend" subtitle="Monthly cash inflows and operational expenses comparison">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`]} />
                  <Line type="monotone" dataKey="Revenue" stroke="#1e3a8a" strokeWidth={3} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Quick Actions Panel */}
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link 
                to="/accountant/billing" 
                className="flex items-center justify-between rounded-xl border border-slate-100 p-3.5 hover:border-navy-200 hover:bg-navy-50/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Patient Billing</p>
                    <p className="text-xs text-slate-500">Generate OP/IP/Lab invoices</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-navy-700 transition" />
              </Link>

              <Link 
                to="/accountant/claims" 
                className="flex items-center justify-between rounded-xl border border-slate-100 p-3.5 hover:border-navy-200 hover:bg-navy-50/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                    <FileWarning className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Insurance Claims</p>
                    <p className="text-xs text-slate-500">Verify and settle claims</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-amber-700 transition" />
              </Link>

              <Link 
                to="/accountant/payroll" 
                className="flex items-center justify-between rounded-xl border border-slate-100 p-3.5 hover:border-navy-200 hover:bg-navy-50/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Payroll Calculation</p>
                    <p className="text-xs text-slate-500">Process salaries & payslips</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-700 transition" />
              </Link>

              <Link 
                to="/accountant/expenses" 
                className="flex items-center justify-between rounded-xl border border-slate-100 p-3.5 hover:border-navy-200 hover:bg-navy-50/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-700">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Record Expense</p>
                    <p className="text-xs text-slate-500">Log vendor & admin payments</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-red-700 transition" />
              </Link>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Last Auto-update: 60s ago</span>
            <Link to="/accountant/analytics" className="text-navy-700 font-semibold hover:underline flex items-center gap-0.5">
              Full Analytics <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Invoices list */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Recent Invoices</h3>
            <p className="text-xs text-slate-500">Most recent billing activities logged in the system.</p>
          </div>
          <Link to="/accountant/billing" className="text-xs font-semibold text-navy-700 hover:underline">
            View All Bills
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                <th className="px-4 py-3">Invoice ID</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Date Issued</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No recent invoices found.
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {inv._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {typeof inv.patient === "object" ? inv.patient.name : "Walk-in Patient"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(inv.issuedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "Immediate"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      ₹{inv.totals.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[inv.status]} className="w-36">{inv.status.replace("_", " ")}</Badge>
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
