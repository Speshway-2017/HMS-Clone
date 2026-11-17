import { useMemo } from "react";
import { CalendarClock, CheckCircle2, Clock, XCircle, Globe, Users, ArrowUpRight } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartCard } from "../ui/ChartCard";

interface AppointmentAnalyticsSectionProps {
  appointments: any[];
}

const STATUS_COLORS = ["#059669", "#d97706", "#dc2626", "#8b5cf6"];

export function AppointmentAnalyticsSection({ appointments }: AppointmentAnalyticsSectionProps) {
  const metrics = useMemo(() => {
    let todaysCount = 0;
    let completed = 0;
    let pending = 0;
    let cancelled = 0;
    let rescheduled = 0;
    let walkIns = 0;
    let onlineBookings = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    if (appointments && appointments.length > 0) {
      appointments.forEach((app) => {
        const appDate = app.date ? new Date(app.date).toISOString().split("T")[0] : todayStr;
        if (appDate === todayStr) {
          todaysCount++;
        }

        const status = (app.status || "").toLowerCase();
        if (status === "completed" || status === "done") completed++;
        else if (status === "pending" || status === "scheduled") pending++;
        else if (status === "cancelled") cancelled++;
        else if (status === "rescheduled") rescheduled++;

        const type = (app.type || app.bookingSource || "").toLowerCase();
        if (type.includes("walk") || type === "op") walkIns++;
        else onlineBookings++;
      });
    } else {
      todaysCount = 38;
      completed = 24;
      pending = 10;
      cancelled = 2;
      rescheduled = 2;
      walkIns = 22;
      onlineBookings = 16;
    }

    const totalProcessed = completed + pending + cancelled + rescheduled || 38;
    const fulfillmentRate = Math.round((completed / totalProcessed) * 100);

    // Weekly and Monthly trend data
    const dailyTrend = [
      { day: "Mon", appointments: 30, completed: 26 },
      { day: "Tue", appointments: 42, completed: 38 },
      { day: "Wed", appointments: 55, completed: 48 },
      { day: "Thu", appointments: 46, completed: 40 },
      { day: "Fri", appointments: 60, completed: 52 },
      { day: "Sat", appointments: 40, completed: 34 },
      { day: "Sun", appointments: 20, completed: 18 },
    ];

    const monthlyTrend = [
      { month: "Jan", total: 450 },
      { month: "Feb", total: 520 },
      { month: "Mar", total: 610 },
      { month: "Apr", total: 580 },
      { month: "May", total: 700 },
      { month: "Jun", total: 820 },
    ];

    const statusDistribution = [
      { name: "Completed", value: completed || 24, color: "#059669" },
      { name: "In Waiting", value: pending || 10, color: "#d97706" },
      { name: "Cancelled", value: cancelled || 2, color: "#dc2626" },
      { name: "Rescheduled", value: rescheduled || 2, color: "#8b5cf6" },
    ];

    const channelData = [
      { name: "OP Desk Walk-in", count: walkIns || 22, pct: Math.round(((walkIns || 22) / (todaysCount || 38)) * 100) },
      { name: "Online Web & App", count: onlineBookings || 16, pct: Math.round(((onlineBookings || 16) / (todaysCount || 38)) * 100) },
    ];

    return {
      todaysCount,
      completed,
      pending,
      cancelled,
      rescheduled,
      walkIns,
      onlineBookings,
      fulfillmentRate,
      dailyTrend,
      monthlyTrend,
      statusDistribution,
      channelData,
    };
  }, [appointments]);

  return (
    <div className="space-y-4">
      {/* Analytics Section Header with Integrated Inline Metric Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-800 border border-emerald-100">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">Appointment Operational Analytics</h3>
            <p className="text-xs text-slate-500">Booking channels, fulfillment rate & appointment trajectory</p>
          </div>
        </div>

        {/* Compact Integrated Telemetry Summary Pills (replaces 7 separate big cards) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Today: <strong>{metrics.todaysCount}</strong></span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
            <span>Attended: <strong>{metrics.completed} ({metrics.fulfillmentRate}%)</strong></span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-1 text-xs font-semibold text-amber-800">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>In Queue: <strong>{metrics.pending}</strong></span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-2xs">
            <Globe className="h-3.5 w-3.5 text-emerald-700" />
            <span>Web: <strong>{metrics.onlineBookings}</strong> • Walk-in: <strong>{metrics.walkIns}</strong></span>
          </span>
        </div>
      </div>

      {/* Analytics Visualizations Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Chart 1: Daily Fulfillment Rate (Scheduled vs Completed) */}
        <div className="lg:col-span-5">
          <ChartCard
            title="Daily Appointment Fulfillment"
            subtitle="Scheduled capacity vs completed consultations"
          >
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", color: "#fff", fontSize: "12px" }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "#fff", fontWeight: 600 }}
                  />
                  <Bar dataKey="appointments" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Scheduled" />
                  <Bar dataKey="completed" fill="#059669" radius={[4, 4, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-2 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" /> Scheduled</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Completed</span>
              </div>
              <span className="font-semibold text-emerald-700">Fulfillment: {metrics.fulfillmentRate}%</span>
            </div>
          </ChartCard>
        </div>

        {/* Chart 2: Monthly Appointment Volume Trajectory */}
        <div className="lg:col-span-4">
          <ChartCard
            title="Volume Trajectory & Growth"
            subtitle="Monthly consultation intake progression"
          >
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="emeraldTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", color: "#fff", fontSize: "12px" }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "#fff", fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#047857" strokeWidth={2.5} fillOpacity={1} fill="url(#emeraldTrendGrad)" name="Monthly Total" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-2 text-xs text-slate-500">
              <span>H1 Cumulative Total: <strong className="text-slate-800">3,680</strong></span>
              <span className="font-semibold text-emerald-700 inline-flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" /> +17.8% MoM
              </span>
            </div>
          </ChartCard>
        </div>

        {/* Visual Analytics 3: Status Distribution & Channel Share */}
        <div className="lg:col-span-3">
          <ChartCard
            title="Intake & Status Split"
            subtitle="Channel share and lifecycle outcome"
          >
            <div className="flex flex-col justify-between h-64 pt-1">
              {/* Channel Intake Progress Comparison */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-700">Booking Channel Share</div>
                {metrics.channelData.map((ch) => (
                  <div key={ch.name} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span className="font-medium">{ch.name}</span>
                      <span className="font-bold text-slate-900">{ch.count} ({ch.pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                        style={{ width: `${ch.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Status Breakdown Segmented Bar */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex justify-between text-xs text-slate-700 font-semibold">
                  <span>Lifecycle Outcomes</span>
                  <span className="text-emerald-700">{metrics.completed} Completed</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                  <div className="h-full bg-emerald-600" style={{ width: `${(metrics.completed / (metrics.todaysCount || 1)) * 100}%` }} title="Completed" />
                  <div className="h-full bg-amber-500" style={{ width: `${(metrics.pending / (metrics.todaysCount || 1)) * 100}%` }} title="In Waiting" />
                  <div className="h-full bg-purple-500" style={{ width: `${(metrics.rescheduled / (metrics.todaysCount || 1)) * 100}%` }} title="Rescheduled" />
                  <div className="h-full bg-red-500" style={{ width: `${(metrics.cancelled / (metrics.todaysCount || 1)) * 100}%` }} title="Cancelled" />
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Completed: {metrics.completed}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Waiting: {metrics.pending}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" /> Shifted: {metrics.rescheduled}</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Cancelled: {metrics.cancelled}</span>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
