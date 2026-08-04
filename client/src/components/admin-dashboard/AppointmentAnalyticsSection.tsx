import { useMemo } from "react";
import { CalendarClock, CheckCircle2, Clock, XCircle, RefreshCw, UserCheck, Globe } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartCard } from "../ui/ChartCard";

interface AppointmentAnalyticsSectionProps {
  appointments: any[];
}

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

    return {
      todaysCount,
      completed,
      pending,
      cancelled,
      rescheduled,
      walkIns,
      onlineBookings,
      dailyTrend,
      monthlyTrend,
    };
  }, [appointments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-sky-50 p-2 text-sky-700">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Appointment Analytics</h3>
            <p className="text-xs text-slate-500">Booking channels, fulfillment rate & appointment volume trends</p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Today's Total">Today's Total</p>
          <p className="mt-2 text-2xl font-extrabold text-navy-900">{metrics.todaysCount}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Scheduled Today</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Completed">Completed</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{metrics.completed}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Attended</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Pending">Pending</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">{metrics.pending}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">In Waiting List</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Cancelled">Cancelled</p>
          <p className="mt-2 text-2xl font-extrabold text-red-600">{metrics.cancelled}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Patient Cancelled</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Rescheduled">Rescheduled</p>
          <p className="mt-2 text-2xl font-extrabold text-purple-600">{metrics.rescheduled}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Time Shifted</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Walk-ins">Walk-ins</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-600">{metrics.walkIns}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">OP Desk Booking</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
          <p className="text-[11.5px] sm:text-xs font-semibold text-slate-500 truncate tracking-tight" title="Online Bookings">Online Bookings</p>
          <p className="mt-2 text-2xl font-extrabold text-indigo-600">{metrics.onlineBookings}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Web & App Portal</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Appointments & Completed Bar Chart */}
        <ChartCard title="Daily Appointment Fulfillment" subtitle="Scheduled vs Completed appointments across days">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", color: "#fff", fontSize: "12px" }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#fff", fontWeight: 600 }} />
                <Bar dataKey="appointments" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Scheduled" />
                <Bar dataKey="completed" fill="#0284c7" radius={[4, 4, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Monthly Appointment Trend Area Chart */}
        <ChartCard title="Monthly Appointment Growth" subtitle="Longer term volume trajectory">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="appTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b", color: "#fff", fontSize: "12px" }} itemStyle={{ color: "#fff" }} labelStyle={{ color: "#fff", fontWeight: 600 }} />
                <Area type="monotone" dataKey="total" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#appTrendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
