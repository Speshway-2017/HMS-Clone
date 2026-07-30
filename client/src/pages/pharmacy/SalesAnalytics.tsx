import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, DollarSign, Pill, Award, Clipboard, Download, Calendar } from "lucide-react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { ChartCard } from "../../components/ui/ChartCard";
import { Button } from "../../components/ui/Button";
import { useInvoices } from "../../features/invoices";

interface MedicineSales {
  name: string;
  category: string;
  qtySold: number;
  revenue: number;
}

interface StockMovement {
  _id: string;
  medName: string;
  movementType: "IN (Restock)" | "OUT (Dispense)";
  quantity: number;
  date: string;
}

export function PharmacySalesAnalytics() {
  const { data: dbInvoiceData, isLoading } = useInvoices({});
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [monthlySales, setMonthlySales] = useState<any[]>([]);
  const [topMeds, setTopMeds] = useState<MedicineSales[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    // Generate analytics data dynamically based on invoices, dispensing records, and POs
    const rawInvoices = dbInvoiceData?.data || [];
    const invoices = rawInvoices.map((inv: any) => ({
      _id: inv._id,
      date: new Date(inv.issuedAt || inv.createdAt).toISOString().split("T")[0],
      items: (inv.items || []).map((it: any) => ({
        name: it.description,
        quantity: it.quantity,
        price: it.amount
      })),
      total: inv.totals?.total || inv.total || 0,
      status: inv.status === "paid" ? "Paid" : "Pending",
    }));

    const savedDispensing = localStorage.getItem("hms_pharmacy_dispensing");
    const dispensing = savedDispensing ? JSON.parse(savedDispensing) : [];

    const savedPOs = localStorage.getItem("hms_pharmacy_purchase_orders");
    const purchaseOrders = (savedPOs ? JSON.parse(savedPOs) : []).filter(
      (po: any) =>
        po.supplierName !== "Global Pharma Distributors" &&
        po.supplierName !== "Acme Healthcare Corp" &&
        po.supplierName !== "Apex MediSupplies"
    );

    // 1. Calculate Daily Sales (last 7 days)
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const last7DaysList = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    }).reverse();

    const daily = last7DaysList.map(dateObj => {
      const dateStr = dateObj.toISOString().split("T")[0];
      const dayName = daysOfWeek[dateObj.getDay()];
      const dayInvoices = invoices.filter((inv: any) => inv.date === dateStr);
      const revenue = dayInvoices.reduce((sum: number, inv: any) => sum + inv.total, 0);
      return { day: dayName, sales: dayInvoices.length, revenue };
    });
    setDailySales(daily);

    // 2. Calculate Monthly Sales (last 6 months)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const last6MonthsList = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return { year: d.getFullYear(), month: d.getMonth() };
    }).reverse();

    const monthly = last6MonthsList.map(({ year, month }) => {
      const monthLabel = months[month];
      const monthInvoices = invoices.filter((inv: any) => {
        const invDate = new Date(inv.date);
        return invDate.getFullYear() === year && invDate.getMonth() === month;
      });
      const revenue = monthInvoices.reduce((sum: number, inv: any) => sum + inv.total, 0);
      return { month: monthLabel, monthRevenue: revenue, prescriptions: monthInvoices.length };
    });
    setMonthlySales(monthly);

    // 3. Top Selling Medicines (from dispensing records)
    const medSalesMap: Record<string, { category: string; qtySold: number; revenue: number }> = {};
    dispensing.forEach((record: any) => {
      record.medicines?.forEach((med: any) => {
        if (!medSalesMap[med.name]) {
          medSalesMap[med.name] = { category: "Medication", qtySold: 0, revenue: 0 };
        }
        medSalesMap[med.name].qtySold += med.quantity;
        medSalesMap[med.name].revenue += med.quantity * (med.price || 0);
      });
    });

    const topMedsList: MedicineSales[] = Object.entries(medSalesMap)
      .map(([name, val]) => ({
        name,
        category: val.category,
        qtySold: val.qtySold,
        revenue: val.revenue
      }))
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, 5);
    setTopMeds(topMedsList);

    // 4. Stock Movements (OUT from dispensing, IN from POs if delivered)
    const movementsList: StockMovement[] = [];
    
    dispensing.forEach((record: any) => {
      record.medicines?.forEach((med: any, idx: number) => {
        movementsList.push({
          _id: `MOV-OUT-${record._id}-${idx}`,
          medName: med.name,
          movementType: "OUT (Dispense)",
          quantity: med.quantity,
          date: record.date
        });
      });
    });

    purchaseOrders.forEach((po: any) => {
      if (po.status === "Delivered") {
        po.items?.forEach((item: any, idx: number) => {
          movementsList.push({
            _id: `MOV-IN-${po._id}-${idx}`,
            medName: item.name,
            movementType: "IN (Restock)",
            quantity: item.quantity,
            date: po.date
          });
        });
      }
    });

    movementsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setMovements(movementsList.slice(0, 10));
  }, [dbInvoiceData]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-slate-500 font-medium">Loading sales analytics...</div>
      </div>
    );
  }

  const handleExport = (type: "pdf" | "excel") => {
    alert(`Simulation: Exporting Sales Report as ${type.toUpperCase()}. Downloading file...`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales & Inventory Analytics</h1>
          <p className="text-sm text-slate-500">Analyze daily sales, top-selling formulations, and stock movement logs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleExport("excel")} className="flex items-center gap-1.5 text-xs py-1.5">
            <Download className="h-3.5 w-3.5" /> Export Excel
          </Button>
          <Button onClick={() => handleExport("pdf")} className="flex items-center gap-1.5 text-xs py-1.5">
            <Download className="h-3.5 w-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Revenue</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">₹7.10 L</div>
            <span className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" /> +14.2% MoM
            </span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-700">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Prescriptions Handled</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">840</div>
            <span className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" /> +8.5% MoM
            </span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Clipboard className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg. Basket Size</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">₹845.20</div>
            <span className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5 mt-1">
              <ArrowDownRight className="h-3.5 w-3.5" /> -1.8% MoM
            </span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Medicines Restocked</div>
            <div className="mt-1 text-2xl font-bold text-slate-800">300 Units</div>
            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5 mt-1">
              <Calendar className="h-3.5 w-3.5" /> This week
            </span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
            <Pill className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Daily & Monthly charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Sales Chart */}
        <ChartCard 
          title="Daily Sales & Revenue" 
          subtitle="Daily sales volume vs billing revenue for the current week."
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySales} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar yAxisId="left" dataKey="sales" name="Sales Qty" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="revenue" name="Revenue (₹)" fill="#1E40AF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Monthly Trend Area Chart */}
        <ChartCard 
          title="Monthly Revenue Analytics" 
          subtitle="Growth tracking of monthly pharmacy sales."
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySales} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMonthSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                  formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="monthRevenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorMonthSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Visual top selling & invoice status split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Selling Medicine Quantities sold (Bar Chart) */}
        <ChartCard 
          title="Medicine Volume Distribution" 
          subtitle="Top 5 formulations by total quantity sold."
        >
          <div className="h-[300px]">
            {topMeds.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-450 text-xs font-medium">No sales data recorded.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMeds} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} width={80} />
                  <Tooltip />
                  <Bar dataKey="qtySold" name="Qty Sold" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* Pharmacy Invoice Payment Split (Pie/Donut Chart) */}
        <ChartCard 
          title="Invoices Clearance Split" 
          subtitle="Proportion of paid vs pending pharmacy invoices (volume & count)."
        >
          <div className="h-[300px]">
            {(() => {
              const invoicesList = dbInvoiceData?.data || [];
              let paidCount = 0;
              let pendingCount = 0;
              let paidAmt = 0;
              let pendingAmt = 0;
              invoicesList.forEach((inv: any) => {
                const amt = inv.totals?.total || inv.total || 0;
                if (inv.status === "paid") {
                  paidCount++;
                  paidAmt += amt;
                } else {
                  pendingCount++;
                  pendingAmt += amt;
                }
              });

              const billingStatsData = [
                { name: "Paid collections", value: paidAmt, count: paidCount, color: "#10b981" },
                { name: "Outstanding bills", value: pendingAmt, count: pendingCount, color: "#f59e0b" }
              ].filter(d => d.value > 0);

              if (billingStatsData.length === 0) {
                return <div className="h-full flex items-center justify-center text-slate-450 text-xs font-medium">No invoices logged.</div>;
              }

              return (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={billingStatsData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {billingStatsData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`]} />
                    <Legend
                      formatter={(value) => <span className="text-[11px] text-slate-650 font-medium">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </ChartCard>
      </div>

      {/* Top Selling & Stock Movement Grid lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Selling Medicines */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-800 flex items-center gap-1.5">
            <Award className="h-5 w-5 text-navy-700" /> Top Selling Formulations
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                  <th className="p-3">Medicine Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-center">Qty Sold</th>
                  <th className="p-3 text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topMeds.map((med, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 text-slate-800 font-medium">
                    <td className="p-3 font-semibold text-slate-900">{med.name}</td>
                    <td className="p-3 text-slate-550">{med.category}</td>
                    <td className="p-3 text-center font-mono">{med.qtySold} units</td>
                    <td className="p-3 text-right font-bold font-mono">₹{med.revenue.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Stock Movement Reports */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-800 flex items-center gap-1.5">
            <BarChart3 className="h-5 w-5 text-navy-700" /> Stock Movement Log (Real-time)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                  <th className="p-3">Movement Ref</th>
                  <th className="p-3">Medicine</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right font-mono">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((mov) => {
                  const isIn = mov.movementType.startsWith("IN");
                  return (
                    <tr key={mov._id} className="hover:bg-slate-50 text-slate-800">
                      <td className="p-3 font-mono font-bold text-navy-700">{mov._id}</td>
                      <td className="p-3 font-semibold">{mov.medName}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded px-2 py-0.5 text-[9px] font-bold ${isIn ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {mov.movementType}
                        </span>
                      </td>
                      <td className={`p-3 text-center font-mono font-bold ${isIn ? "text-green-600" : "text-slate-800"}`}>
                        {isIn ? "+" : "-"}{mov.quantity}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">{mov.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
