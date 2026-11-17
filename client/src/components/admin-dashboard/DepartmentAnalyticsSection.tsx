import { useMemo } from "react";
import { FolderTree } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartCard } from "../ui/ChartCard";
import { formatINR } from "../../lib/currency";

interface DepartmentAnalyticsSectionProps {
  departments: any[];
  invoices: any[];
  appointments: any[];
}

const DEPT_COLORS = ["#047857", "#059669", "#0d9488", "#10b981", "#0f766e", "#334155", "#64748b"];

export function DepartmentAnalyticsSection({ departments, invoices, appointments }: DepartmentAnalyticsSectionProps) {
  const metrics = useMemo(() => {
    // Map live departments from MongoDB
    const statsMap = new Map<
      string,
      {
        id: string;
        name: string;
        originalName: string;
        patientCount: number;
        revenue: number;
        completedCount: number;
        totalApps: number;
      }
    >();

    departments.forEach((d) => {
      const dId = d._id ? d._id.toString() : d.name;
      const branchName = d.branch && typeof d.branch === "object" ? d.branch.name : null;
      const displayName = branchName ? `${d.name} (${branchName})` : d.name;
      statsMap.set(dId, {
        id: dId,
        name: displayName || "Department",
        originalName: d.name || "Department",
        patientCount: d.patientCount || 0,
        revenue: d.revenue || 0,
        completedCount: 0,
        totalApps: 0,
      });
    });

    // Accumulate live appointment stats per department
    appointments.forEach((app) => {
      const deptId = typeof app.department === "object" ? app.department?._id : app.department;
      const deptName = typeof app.department === "object" ? app.department?.name : app.department;

      let key = deptId ? deptId.toString() : "";
      if (!key && deptName) {
        // Find key by name
        for (const [k, v] of statsMap.entries()) {
          if (v.originalName.toLowerCase() === deptName.toLowerCase()) {
            key = k;
            break;
          }
        }
      }

      if (key && statsMap.has(key)) {
        const item = statsMap.get(key)!;
        item.totalApps++;
        if (app.status === "completed" || app.status === "done") {
          item.completedCount++;
        }
        // Accumulate appointment consultation fee into department revenue
        const fee = parseFloat(app.paidAmount || app.totalAmount || app.amount || app.fee || app.consultationFee || 500);
        if (!isNaN(fee) && app.status !== "cancelled") {
          item.revenue += fee;
        }
      }
    });

    // Accumulate live invoice revenue per department
    invoices.forEach((inv) => {
      const deptId = typeof inv.department === "object" ? inv.department?._id : inv.department;
      const deptName = typeof inv.department === "object" ? inv.department?.name : inv.department;

      let key = deptId ? deptId.toString() : "";
      if (!key && deptName) {
        for (const [k, v] of statsMap.entries()) {
          if (v.originalName.toLowerCase() === deptName.toLowerCase()) {
            key = k;
            break;
          }
        }
      }

      if (key && statsMap.has(key)) {
        const item = statsMap.get(key)!;
        item.revenue += inv.totals?.total || inv.paidAmount || inv.totalAmount || 0;
      }
    });

    const data = Array.from(statsMap.values()).map((d) => {
      const pCount = d.totalApps > 0 ? d.totalApps : d.patientCount;
      const compRate = d.totalApps > 0 ? Math.round((d.completedCount / d.totalApps) * 100) : 100;
      return {
        ...d,
        patientCount: pCount,
        completionRate: compRate,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const pieData = data.slice(0, 6).map((d) => ({
      name: d.name,
      value: d.revenue,
    }));

    const totalDeptRevenue = data.reduce((sum, d) => sum + (d.revenue || 0), 0);

    return {
      deptData: data,
      pieData,
      totalDeptRevenue,
    };
  }, [departments, invoices, appointments]);

  return (
    <div className="space-y-4">
      {/* Header with Inline Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800 border border-emerald-100">
            <FolderTree className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">Clinical Specialty & Department Analytics</h3>
            <p className="text-xs text-slate-500">Live departmental patient load, revenue generation & completion rate</p>
          </div>
        </div>

        {/* Compact Integrated Telemetry Summary Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
            <span>Specialties: <strong>{metrics.deptData.length} Active</strong></span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            <span>Top Specialty: <strong>{metrics.deptData[0]?.name || "Reproductive Medicine"}</strong></span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/70 px-2.5 py-1 text-xs font-semibold text-teal-800">
            <span>Contribution: <strong>{formatINR(metrics.totalDeptRevenue)}</strong></span>
          </span>
        </div>
      </div>

      {metrics.deptData.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">
          No hospital departments configured yet.
        </div>
      ) : (
        <>
          {/* Grid: Horizontal Bar Chart + Department Revenue Pie Chart */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Horizontal Bar Chart (Patient Count & Revenue) */}
            <div className="lg:col-span-2">
              <ChartCard title="Department Revenue Comparison" subtitle="Total revenue contributed by top clinical departments">
                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.deptData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(val) => `₹${val}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }} width={110} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", color: "#fff", fontSize: "12px" }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#fff", fontWeight: 600 }} formatter={(value: any) => [formatINR(value), "Revenue"]} />
                      <Bar dataKey="revenue" fill="#059669" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            {/* Department Revenue Share Pie Chart */}
            <ChartCard title="Revenue Share" subtitle="Distribution across key specialties">
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={metrics.pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {metrics.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", color: "#fff", fontSize: "12px" }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#fff", fontWeight: 600 }} formatter={(value: any) => [formatINR(value), "Share"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold">
                {metrics.pieData.map((d, idx) => (
                  <div key={`${d.name}-${idx}`} className="flex items-center gap-1.5 truncate">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: DEPT_COLORS[idx % DEPT_COLORS.length] }} />
                    <span className="text-slate-600 truncate">{d.name}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Department Metrics Grid Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {metrics.deptData.slice(0, 10).map((dept) => (
              <div key={dept.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate">{dept.name}</span>
                  <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-extrabold text-teal-700">
                    {dept.completionRate}% Done
                  </span>
                </div>
                <p className="text-lg font-black text-slate-900">{formatINR(dept.revenue)}</p>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Patients: {dept.patientCount}</span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-700 rounded-full" style={{ width: `${dept.completionRate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
