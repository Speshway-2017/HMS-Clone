import { Building2, TrendingUp, CreditCard, Receipt, Calendar } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGlobalAnalytics } from "../../features/analytics";
import { KpiCard } from "../../components/ui/KpiCard";
import { ChartCard } from "../../components/ui/ChartCard";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AnalyticsPage() {
  const { data, isLoading } = useGlobalAnalytics();

  const sales = data?.sales;
  const hospitals = data?.hospitals.list || [];
  const salesByHospital = sales?.salesByHospital || [];
  const salesTrend = sales?.salesTrend || [];

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Hospital & Sales Analytics</h1>
        <p className="text-xs sm:text-sm text-slate-500">Real-time revenue intelligence and hospital billing metrics.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Hospitals"
          value={data?.hospitals.total ?? 0}
          icon={<Building2 className="h-4 w-4" />}
          emphasis
          trend={{ direction: "up", text: `${data?.hospitals.active ?? 0} active` }}
          to="/super-admin/hospitals"
        />
        <KpiCard
          label="Total Sales"
          value={formatCurrency(sales?.totalSales ?? 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={{ direction: "up", text: `${sales?.totalInvoices ?? 0} paid invoices` }}
        />
        <KpiCard
          label="Today's Sales"
          value={formatCurrency(sales?.todaySales ?? 0)}
          icon={<CreditCard className="h-4 w-4" />}
          trend={{ direction: "up", text: "Today" }}
        />
        <KpiCard
          label="This Month's Sales"
          value={formatCurrency(sales?.thisMonthSales ?? 0)}
          icon={<Calendar className="h-4 w-4" />}
          trend={{ direction: "up", text: "Current month" }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Sales by Hospital" subtitle="Revenue generated per registered hospital facility">
          <div className="h-72">
            {!isLoading && (salesByHospital.length === 0 || salesByHospital.every((h) => h.sales === 0)) ? (
              <div className="flex h-full flex-col items-center justify-center text-xs text-slate-400 gap-1">
                <Receipt className="h-6 w-6 text-slate-300" />
                <span>No paid invoice sales recorded yet.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByHospital} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-10} textAnchor="end" height={50} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), "Sales"]} />
                  <Bar dataKey="sales" fill="#15803d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Daily Sales (Last 7 Days)" subtitle="Real billing transactions by date">
          <div className="h-72">
            {!isLoading && (salesTrend.length === 0 || salesTrend.every((d) => d.sales === 0)) ? (
              <div className="flex h-full flex-col items-center justify-center text-xs text-slate-400 gap-1">
                <TrendingUp className="h-6 w-6 text-slate-300" />
                <span>No sales transactions in the last 7 days.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrend} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), "Sales"]} />
                  <Bar dataKey="sales" fill="#0b3322" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
