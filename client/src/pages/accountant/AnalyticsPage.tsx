import { useState } from "react";
import { 
  TrendingUp, 
  Download, 
  Calendar, 
  Filter, 
  FileSpreadsheet, 
  FileText,
  DollarSign
} from "lucide-react";
import { useInvoices } from "../../features/invoices";
import { useAccountantDashboard } from "../../features/accountantDashboard";
import { Card } from "../../components/ui/Card";
import { ChartCard } from "../../components/ui/ChartCard";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Cell, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  ComposedChart,
  Line
} from "recharts";

const COLORS = ["#1e3a8a", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

export function AccountantAnalyticsPage() {
  const [filterPeriod, setFilterPeriod] = useState("This Month");
  const { data: invoiceData } = useInvoices({ page: 1 });
  const { data: dashboardData, isLoading } = useAccountantDashboard();

  const dailyCollections = dashboardData?.charts?.daily?.map((d) => ({
    date: d.label,
    Collections: d.revenue,
  })) || [];

  const BILLING_TYPE_LABEL: Record<string, string> = {
    OP: "Outpatient (OP)",
    IP: "Inpatient (IP)",
    PHARMACY: "Pharmacy",
    LAB: "Laboratory",
    RADIOLOGY: "Radiology",
    EMERGENCY: "Emergency",
    OTHER: "Other",
  };

  const deptShare = dashboardData?.charts?.billingTypeDistribution?.map((item) => ({
    name: BILLING_TYPE_LABEL[item.type] || item.type,
    value: item.amount,
  })) || [];

  const taxSummary = dashboardData?.charts?.taxComplianceSeries || [];

  // CSV Exporter
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Reporting Month,Subtotal (INR),Service Fee (INR),Tax Collected (INR),Total Collections (INR)\r\n";
    
    taxSummary.forEach((row: any) => {
      csvContent += `${row.month},${row.subtotal},${row.serviceFee},${row.taxCollected},${row.total}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Hospital_Financial_Summary_2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Examine daily collections, department revenue shares, and tax breakdowns.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" /> Export Excel/CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-navy-700 hover:bg-navy-800 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition"
          >
            <Download className="h-4 w-4" /> Export PDF Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily collections area chart */}
        <div className="lg:col-span-2">
          <ChartCard title="Daily Collections (Last 7 Days)" subtitle="Trend of patient payments collected per day">
            <div className="h-72 w-full">
              {isLoading ? (
                <div className="animate-pulse bg-slate-100 rounded-lg h-full w-full flex items-center justify-center text-slate-400 font-medium">
                  Loading collections chart...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyCollections} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCollections" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`]} />
                    <Area type="monotone" dataKey="Collections" stroke="#1e3a8a" strokeWidth={3} fillOpacity={1} fill="url(#colorCollections)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Department share pie chart */}
        <Card>
          <h3 className="text-base font-semibold text-slate-800 mb-1">Department Revenue Share</h3>
          <p className="text-xs text-slate-500 mb-4">Revenue distribution across clinical services</p>
          <div className="h-56 relative">
            {isLoading ? (
              <div className="animate-pulse bg-slate-100 rounded-lg h-full w-full flex items-center justify-center text-slate-400 font-medium">
                Loading share chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptShare}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {deptShare.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Custom Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            {isLoading ? (
              <div className="h-10 col-span-2"></div>
            ) : (
              deptShare.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  <span className="text-slate-650 truncate" title={item.name}>{item.name}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly Profitability Trend */}
        <div className="lg:col-span-2">
          <ChartCard title="Monthly Profitability Trend" subtitle="Revenues, operational expenses, and net profit margins over the last 7 months">
            <div className="h-72 w-full">
              {isLoading ? (
                <div className="animate-pulse bg-slate-100 rounded-lg h-full w-full flex items-center justify-center text-slate-400 font-medium">
                  Loading profitability chart...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dashboardData?.charts?.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip formatter={(v: number, name: string) => [`₹${Number(v).toLocaleString("en-IN")}`, name]} />
                    <Legend formatter={(value) => <span className="text-xs text-slate-650 font-semibold">{value}</span>} />
                    <Bar dataKey="revenue" name="Revenue" fill="#1e3a8a" radius={[3, 3, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={30} />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      name="Net Profit"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#10b981" }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Doctor consultation revenue share */}
        <Card>
          <h3 className="text-base font-semibold text-slate-800 mb-1">Doctor Revenue Share</h3>
          <p className="text-xs text-slate-500 mb-4">Total fees collected per attending doctor</p>
          <div className="h-56 relative">
            {isLoading ? (
              <div className="animate-pulse bg-slate-100 rounded-lg h-full w-full flex items-center justify-center text-slate-400 font-medium">
                Loading share chart...
              </div>
            ) : (dashboardData?.charts?.doctorRevenueDistribution?.length ?? 0) === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                No consultation payments logged.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData?.charts?.doctorRevenueDistribution}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {dashboardData?.charts?.doctorRevenueDistribution?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Custom Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
            {!isLoading && dashboardData?.charts?.doctorRevenueDistribution?.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                <span className="text-slate-650 truncate" title={item.name}>{item.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tax Summary Table */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Monthly Tax & Service Fee Summary</h3>
            <p className="text-xs text-slate-500">Summary of subtotal revenues, service fees, and taxes collected for fiscal compliance.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                <th className="px-4 py-3">Reporting Month</th>
                <th className="px-4 py-3">Gross Subtotal (₹)</th>
                <th className="px-4 py-3">Service Fees (₹)</th>
                <th className="px-4 py-3">GST/Tax Collected (₹)</th>
                <th className="px-4 py-3">Net Volume (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {taxSummary.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {row.month}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {row.subtotal.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {row.serviceFee.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 font-mono text-amber-700 font-semibold">
                    {row.taxCollected.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">
                    {row.total.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
