import { useMemo } from "react";
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  UserPlus, 
  RefreshCw, 
  UserCheck, 
  Activity, 
  Sparkles,
  TrendingUp
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { ChartCard } from "../ui/ChartCard";

interface PatientAnalyticsSectionProps {
  patients: any[];
  admissions?: any[];
  appointments?: any[];
  isLoading: boolean;
}

const GENDER_COLORS = ["#0f172a", "#3b82f6", "#ec4899", "#94a3b8"];

const CustomAnalyticsTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl text-slate-900 text-xs space-y-1.5 z-50 pointer-events-none">
        {label && <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-1 mb-1">{label}</p>}
        <div className="space-y-1">
          {payload.map((item: any, idx: number) => {
            const color = item.color || item.fill || "#4f46e5";
            const name = item.name || item.dataKey || "Count";
            return (
              <div key={idx} className="flex items-center justify-between gap-4 font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-slate-700">{name}:</span>
                </div>
                <span className="font-extrabold text-slate-900">{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export function PatientAnalyticsSection({ patients, admissions = [], appointments = [], isLoading }: PatientAnalyticsSectionProps) {
  // Aggregate Patient Analytics dynamically from live MongoDB data
  const metrics = useMemo(() => {
    // 1. Build IP patient set from active/past admissions
    const ipPatientIds = new Set<string>();
    admissions.forEach((adm: any) => {
      const pId = typeof adm.patient === "object" ? adm.patient?._id : adm.patient;
      if (pId) ipPatientIds.add(pId.toString());
    });

    // 2. Build appointment frequency map per patient to classify revisits
    const patientAppointmentCounts = new Map<string, number>();
    appointments.forEach((app: any) => {
      const pId = typeof app.patient === "object" ? app.patient?._id?.toString() : app.patient?.toString();
      if (pId) {
        patientAppointmentCounts.set(pId, (patientAppointmentCounts.get(pId) || 0) + 1);
      }
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
    let revisitingCount = 0;

    let singleVisitCount = 0; // 1 visit
    let regularVisitCount = 0; // 2-3 visits
    let frequentVisitCount = 0; // 4+ visits

    // Monthly buckets for last 6 months trend
    const monthBuckets: { [key: string]: { total: number; newPatients: number; revisitingPatients: number } } = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      monthBuckets[label] = { total: 0, newPatients: 0, revisitingPatients: 0 };
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

      // New vs Revisiting Determination
      const apptCountForPatient = patientAppointmentCounts.get(pIdStr) || 0;
      const medHistoryCount = Array.isArray(p.medicalHistory) ? p.medicalHistory.length : 0;
      const totalVisits = Math.max(1, apptCountForPatient, medHistoryCount, p.visitCount || 1);
      const isRevisit = apptCountForPatient > 1 || medHistoryCount > 1 || p.visitCount > 1 || p.isRevisit === true || p.type === "Revisit";

      if (isRevisit) {
        revisitingCount++;
      } else {
        newCount++;
      }

      if (totalVisits === 1) singleVisitCount++;
      else if (totalVisits <= 3) regularVisitCount++;
      else frequentVisitCount++;

      // Trend monthly
      const mLabel = created.toLocaleString("default", { month: "short" });
      if (monthBuckets[mLabel]) {
        monthBuckets[mLabel].total++;
        if (isRevisit) {
          monthBuckets[mLabel].revisitingPatients++;
        } else {
          monthBuckets[mLabel].newPatients++;
        }
      }
    });

    // Cross-reference appointments to track follow-up visits in monthly buckets
    appointments.forEach((app) => {
      const appDate = new Date(app.date || app.createdAt || Date.now());
      const mLabel = appDate.toLocaleString("default", { month: "short" });
      if (monthBuckets[mLabel]) {
        const isFollowUp = app.type === "Follow-up" || app.followUp === true || app.isRevisit === true;
        if (isFollowUp) {
          monthBuckets[mLabel].revisitingPatients++;
        }
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

    const totalCount = patients.length;
    const newPct = totalCount > 0 ? Math.round((newCount / totalCount) * 100) : 0;
    const revisitingPct = totalCount > 0 ? Math.round((revisitingCount / totalCount) * 100) : 0;
    const avgVisits = totalCount > 0 ? (Math.max(appointments.length, totalCount) / totalCount).toFixed(1) : "1.0";

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
      patients: monthBuckets[month].total,
    }));

    const revisitData = [
      { name: "New Patients (Initial Visit)", value: newCount, color: "#10b981" },
      { name: "Revisiting Patients (Follow-up)", value: revisitingCount, color: "#6366f1" },
    ];

    const revisitTrendData = Object.keys(monthBuckets).map((month) => ({
      month,
      "New Patients": monthBuckets[month].newPatients,
      "Revisiting Patients": monthBuckets[month].revisitingPatients,
    }));

    const loyaltyData = [
      { name: "Single Visit (New)", value: singleVisitCount, color: "#3b82f6" },
      { name: "Regular (2-3 Visits)", value: regularVisitCount, color: "#10b981" },
      { name: "Frequent (4+ Visits)", value: frequentVisitCount, color: "#8b5cf6" },
    ];

    return {
      total: totalCount,
      opCount,
      ipCount,
      todaysReg,
      weeklyReg,
      monthlyReg,
      prevMonthlyReg,
      growthPct,
      newCount,
      revisitingCount,
      newPct,
      revisitingPct,
      avgVisits,
      genderData,
      ageData,
      trendData,
      revisitData,
      revisitTrendData,
      loyaltyData,
    };
  }, [patients, admissions, appointments]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
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

      {/* NEW VS REVISITING PATIENT ANALYTICS BANNER & CHARTS (LIGHT THEME) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 ring-1 ring-indigo-200/60">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-slate-900">Patient Acquisition vs Revisit Analytics</h3>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                  Live Personal Stats
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Detailed graphical stats on first-time new patient arrivals versus returning/revisiting hospital patients
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-200 flex items-center gap-2 text-slate-700">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Retention Index: <strong className="text-emerald-600 font-extrabold">{metrics.revisitingPct}%</strong></span>
            </div>
          </div>
        </div>

        {/* 4 Focused Metric Highlights */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* New Patients KPI */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">New Patients</span>
              <div className="rounded-lg bg-emerald-100/80 p-1.5 text-emerald-600">
                <UserPlus className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600">{metrics.newCount}</p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>First-time arrivals</span>
              <span className="font-bold text-emerald-700">{metrics.newPct}%</span>
            </div>
          </div>

          {/* Revisiting Patients KPI */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Revisiting Patients</span>
              <div className="rounded-lg bg-indigo-100/80 p-1.5 text-indigo-600">
                <RefreshCw className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-indigo-600">{metrics.revisitingCount}</p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Follow-ups & re-admit</span>
              <span className="font-bold text-indigo-700">{metrics.revisitingPct}%</span>
            </div>
          </div>

          {/* Revisit Rate KPI */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hospital Revisit Rate</span>
              <div className="rounded-lg bg-amber-100/80 p-1.5 text-amber-600">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-amber-600">{metrics.revisitingPct}%</p>
            <div className="mt-1 text-[11px] text-slate-500 truncate font-medium">
              {metrics.revisitingPct >= 30 ? "High Patient Loyalty" : "Growing Retention"}
            </div>
          </div>

          {/* Engagement Rate KPI */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Visits / Patient</span>
              <div className="rounded-lg bg-cyan-100/80 p-1.5 text-cyan-600">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-cyan-600">{metrics.avgVisits}x</p>
            <div className="mt-1 text-[11px] text-slate-500 truncate font-medium">
              Average consultation visits
            </div>
          </div>
        </div>

        {/* Graphical Section: Donut Split + 6-Month Comparison Trajectory */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Doughnut Chart: New vs Revisiting Distribution */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                New vs. Revisiting Ratio
              </h4>
              <p className="text-[11px] text-slate-500">Distribution of initial consultations versus repeat hospital visits</p>
            </div>

            <div className="h-56 w-full flex items-center justify-center my-2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.revisitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#6366f1" />
                  </Pie>
                  <Tooltip content={<CustomAnalyticsTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none text-center select-none z-10">
                <span className="text-2xl font-black text-slate-900 leading-none">{metrics.total}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Total Patients</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-semibold pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-700">New Patients (First Visit)</span>
                </div>
                <span className="font-bold text-emerald-600">{metrics.newCount} ({metrics.newPct}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-indigo-500" />
                  <span className="text-slate-700">Revisiting Patients (Follow-up)</span>
                </div>
                <span className="font-bold text-indigo-600">{metrics.revisitingCount} ({metrics.revisitingPct}%)</span>
              </div>
            </div>
          </div>

          {/* Grouped Bar Chart: Monthly Trajectory (New vs Revisiting) */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  Monthly Acquisition & Revisit Trajectory
                </h4>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold"><span className="h-2.5 w-2.5 rounded bg-emerald-500" /> New</span>
                  <span className="flex items-center gap-1 text-indigo-700 font-semibold"><span className="h-2.5 w-2.5 rounded bg-indigo-500" /> Revisiting</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">6-month comparison of new patient onboarding vs returning patient visits</p>
            </div>

            <div className="h-60 w-full pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.revisitTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip content={<CustomAnalyticsTooltip />} />
                  <Bar dataKey="New Patients" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Revisiting Patients" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Patient Loyalty & Frequency Insight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          {metrics.loyaltyData.map((l) => (
            <div key={l.name} className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: l.color }} />
                <div>
                  <p className="text-xs font-bold text-slate-800">{l.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {metrics.total > 0 ? Math.round((l.value / metrics.total) * 100) : 0}% of patient base
                  </p>
                </div>
              </div>
              <span className="text-lg font-black text-slate-900">{l.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Total Patients">Total Patients</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.total}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Live Database Records</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="OP Patients">OP Patients</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">{metrics.opCount}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Outpatient Visits</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="IP Patients">IP Patients</p>
          <p className="mt-2 text-2xl font-extrabold text-rose-600">{metrics.ipCount}</p>
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
                <Tooltip content={<CustomAnalyticsTooltip />} />
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
                <Tooltip content={<CustomAnalyticsTooltip />} />
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
                <Tooltip content={<CustomAnalyticsTooltip />} />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
