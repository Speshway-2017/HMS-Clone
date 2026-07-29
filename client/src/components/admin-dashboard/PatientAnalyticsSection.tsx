import { useMemo } from "react";
import { Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { ChartCard } from "../ui/ChartCard";

interface PatientAnalyticsSectionProps {
  patients: any[];
  admissions?: any[];
  isLoading: boolean;
}

const GENDER_COLORS = ["#0f172a", "#3b82f6", "#ec4899", "#94a3b8"];

export function PatientAnalyticsSection({ patients, admissions = [], isLoading }: PatientAnalyticsSectionProps) {
  // Aggregate Patient Analytics dynamically from live MongoDB data
  const metrics = useMemo(() => {
    // 1. Build IP patient set from active/past admissions
    const ipPatientIds = new Set<string>();
    admissions.forEach((adm: any) => {
      const pId = typeof adm.patient === "object" ? adm.patient?._id : adm.patient;
      if (pId) ipPatientIds.add(pId.toString());
    });

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    let opCount = 0;
    let ipCount = 0;
    let todaysReg = 0;
    let weeklyReg = 0;
    let monthlyReg = 0;
    let prevMonthlyReg = 0;

    let male = 0;
    let female = 0;
    let otherGender = 0;

    let child = 0; // < 18
    let adult = 0; // 18 - 60
    let senior = 0; // > 60

    let newCount = 0;
    let returningCount = 0;

    // Monthly buckets for last 6 months trend
    const monthBuckets: { [key: string]: number } = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      monthBuckets[label] = 0;
    }

    patients.forEach((p) => {
      const pIdStr = p._id ? p._id.toString() : "";
      const isIP = ipPatientIds.has(pIdStr) || p.type === "IP" || p.admissionStatus === "admitted" || p.isAdmitted === true;

      if (isIP) {
        ipCount++;
      } else {
        opCount++;
      }

      // Registration Dates
      const created = new Date(p.createdAt || p.registeredAt || Date.now());
      const createdStr = created.toISOString().split("T")[0];

      if (createdStr === todayStr) todaysReg++;
      if (created >= sevenDaysAgo) weeklyReg++;
      if (created >= thirtyDaysAgo) monthlyReg++;
      else if (created >= sixtyDaysAgo && created < thirtyDaysAgo) prevMonthlyReg++;

      // Gender
      const g = (p.gender || "").toLowerCase();
      if (g.startsWith("m")) male++;
      else if (g.startsWith("f")) female++;
      else if (g) otherGender++;

      // Age Group
      const age = Number(p.age) || 0;
      if (age > 0) {
        if (age < 18) child++;
        else if (age <= 60) adult++;
        else senior++;
      }

      // New vs Returning
      if (p.visitCount && p.visitCount > 1) returningCount++;
      else newCount++;

      // Trend monthly
      const mLabel = created.toLocaleString("default", { month: "short" });
      if (monthBuckets[mLabel] !== undefined) {
        monthBuckets[mLabel]++;
      }
    });

    // Fallback IP count if patient documents lack type flag but admissions exist
    if (ipCount === 0 && admissions.length > 0) {
      ipCount = admissions.length;
      opCount = Math.max(0, patients.length - ipCount);
    }

    // MoM Growth % calculation
    let growthPct = 0;
    if (prevMonthlyReg > 0) {
      growthPct = Math.round(((monthlyReg - prevMonthlyReg) / prevMonthlyReg) * 100);
    } else if (monthlyReg > 0) {
      growthPct = 100;
    }

    const genderData = [
      { name: "Male", value: male },
      { name: "Female", value: female },
    ];
    if (otherGender > 0) genderData.push({ name: "Other", value: otherGender });

    const ageData = [
      { name: "Child (<18)", value: child },
      { name: "Adult (18-60)", value: adult },
      { name: "Senior (>60)", value: senior },
    ];

    const trendData = Object.keys(monthBuckets).map((month) => ({
      month,
      patients: monthBuckets[month],
    }));

    return {
      total: patients.length,
      opCount,
      ipCount,
      todaysReg,
      weeklyReg,
      monthlyReg,
      prevMonthlyReg,
      growthPct,
      genderData,
      ageData,
      trendData,
    };
  }, [patients, admissions]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-navy-50 p-2 text-navy-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Patient Analytics</h3>
            <p className="text-xs text-slate-500">Live demographics, growth trends, OP & IP registration distribution</p>
          </div>
        </div>

        {/* Growth Indicator Pill */}
        <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${metrics.growthPct >= 0 ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' : 'bg-red-50 text-red-700 ring-1 ring-red-600/20'}`}>
          {metrics.growthPct >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          <span>{metrics.growthPct >= 0 ? `+${metrics.growthPct}%` : `${metrics.growthPct}%`} Growth MoM</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Total Patients">Total Patients</p>
          <p className="mt-2 text-2xl font-extrabold text-navy-900">{metrics.total}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Live Database Records</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="OP Patients">OP Patients</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-600">{metrics.opCount}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Outpatient Visits</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="IP Patients">IP Patients</p>
          <p className="mt-2 text-2xl font-extrabold text-purple-600">{metrics.ipCount}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Inpatient Admissions</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Today's Registrations">Today's Registrations</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">+{metrics.todaysReg}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Registered Today</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Weekly Registrations">Weekly Registrations</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">+{metrics.weeklyReg}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Last 7 Days</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Monthly Registrations">Monthly Registrations</p>
          <p className="mt-2 text-2xl font-extrabold text-indigo-600">+{metrics.monthlyReg}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Last 30 Days</span>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly Patient Growth Trend (Area Chart) */}
        <ChartCard title="Patient Volume Growth Trend" subtitle="Monthly registration trajectory over time">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="patientGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
                <Area type="monotone" dataKey="patients" stroke="#1e3a8a" strokeWidth={2.5} fillOpacity={1} fill="url(#patientGrowthGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Gender Distribution (Doughnut Chart) */}
        <ChartCard title="Gender Distribution" subtitle="Breakdown of Male vs Female registered patients">
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {metrics.genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs font-semibold">
            {metrics.genderData.map((g, idx) => (
              <div key={g.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GENDER_COLORS[idx % GENDER_COLORS.length] }} />
                <span className="text-slate-600">{g.name}: {g.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Age Group Distribution (Bar Chart) */}
        <ChartCard title="Age Group Breakdown" subtitle="Child (<18), Adult (18-60), Senior (>60)">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
