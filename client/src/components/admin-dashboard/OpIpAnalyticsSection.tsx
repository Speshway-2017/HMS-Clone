import { useMemo } from "react";
import { Activity, BedDouble, ArrowUpRight } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartCard } from "../ui/ChartCard";

interface OpIpAnalyticsSectionProps {
  patients: any[];
  appointments: any[];
  admissions?: any[];
}

const COLORS = ["#2563eb", "#9333ea"]; // OP: Blue, IP: Purple

export function OpIpAnalyticsSection({ patients, appointments, admissions = [] }: OpIpAnalyticsSectionProps) {
  const metrics = useMemo(() => {
    // Live Inpatient Admissions Count
    const ipAdmissions = admissions.length;

    // Live Outpatient Visits Count (Appointments + Patients not in IP)
    let opVisits = appointments.length;
    if (opVisits === 0) {
      opVisits = Math.max(0, patients.length - ipAdmissions);
    }

    const totalCount = opVisits + ipAdmissions;
    const admissionRate = totalCount > 0 ? Math.round((ipAdmissions / totalCount) * 100) : 0;

    const doughnutData = [
      { name: "Outpatient (OP)", value: opVisits },
      { name: "Inpatient (IP)", value: ipAdmissions },
    ];

    // Build 6-month live trend from actual admissions and appointments
    const now = new Date();
    const monthBuckets: { [key: string]: { op: number; ip: number } } = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      monthBuckets[label] = { op: 0, ip: 0 };
    }

    appointments.forEach((app) => {
      const d = new Date(app.date || app.createdAt || Date.now());
      const label = d.toLocaleString("default", { month: "short" });
      if (monthBuckets[label]) {
        monthBuckets[label].op++;
      }
    });

    admissions.forEach((adm) => {
      const d = new Date(adm.admissionDate || adm.createdAt || Date.now());
      const label = d.toLocaleString("default", { month: "short" });
      if (monthBuckets[label]) {
        monthBuckets[label].ip++;
      }
    });

    const trendData = Object.keys(monthBuckets).map((month) => ({
      month,
      op: monthBuckets[month].op,
      ip: monthBuckets[month].ip,
    }));

    return {
      opVisits,
      ipAdmissions,
      admissionRate,
      doughnutData,
      trendData,
    };
  }, [patients, appointments, admissions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">OP vs IP Analytics</h3>
            <p className="text-xs text-slate-500">Live Outpatient volume, Inpatient admissions & admission conversion rates</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Outpatient Visits (OP)</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-blue-600">{metrics.opVisits}</p>
          <p className="mt-1 text-xs text-slate-400">Total consultations & OPD appointments</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Inpatient Admissions (IP)</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <BedDouble className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-purple-600">{metrics.ipAdmissions}</p>
          <p className="mt-1 text-xs text-slate-400">Total ward & ICU bed admissions</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-navy-900 text-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-navy-200">OP → IP Admission Rate</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
              <ArrowUpRight className="h-3.5 w-3.5" /> Ratio
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-white">{metrics.admissionRate}%</p>
          <p className="mt-1 text-xs text-navy-300">OP Patients converted to IP bed admissions</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Doughnut Chart */}
        <ChartCard title="OP vs IP Distribution" subtitle="Proportions of Outpatient vs Inpatient Cases">
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.doughnutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {metrics.doughnutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-6 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-600" />
              <span className="text-slate-700">Outpatient (OP): {metrics.opVisits}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-purple-600" />
              <span className="text-slate-700">Inpatient (IP): {metrics.ipAdmissions}</span>
            </div>
          </div>
        </ChartCard>

        {/* Stacked Area Trend */}
        <ChartCard title="OP & IP Monthly Trend" subtitle="Comparative volume trajectory across months">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
                <Area type="monotone" dataKey="op" stackId="1" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.6} name="OP Visits" />
                <Area type="monotone" dataKey="ip" stackId="1" stroke="#9333ea" fill="#a855f7" fillOpacity={0.8} name="IP Admissions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
