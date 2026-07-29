import { useMemo } from "react";
import { Stethoscope, Award } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartCard } from "../ui/ChartCard";

interface DoctorAnalyticsSectionProps {
  doctors: any[];
  appointments: any[];
}

export function DoctorAnalyticsSection({ doctors, appointments }: DoctorAnalyticsSectionProps) {
  const metrics = useMemo(() => {
    const total = doctors.length;
    let onDuty = 0;
    let available = 0;
    let busy = 0;

    doctors.forEach((d) => {
      const status = (d.status || d.dutyStatus || "").toLowerCase();
      if (status === "on_duty" || status === "active") onDuty++;
      if (status === "available" || status === "active") available++;
      if (status === "busy" || status === "in_consultation") busy++;
    });

    const totalConsultations = appointments.length;
    const avgConsultations = total > 0 ? (totalConsultations / total).toFixed(1) : "0";

    // Top performing doctors leaderboard
    const docMap = new Map<string, { id: string; name: string; dept: string; count: number }>();
    doctors.forEach((d) => {
      docMap.set(d._id, {
        id: d._id,
        name: d.name || "Doctor",
        dept: typeof d.department === "object" ? d.department?.name : (d.department || "General"),
        count: 0,
      });
    });

    appointments.forEach((app) => {
      const docId = typeof app.doctor === "object" ? app.doctor?._id : app.doctor;
      if (docId && docMap.has(docId)) {
        docMap.get(docId)!.count++;
      }
    });

    const topDoctors = Array.from(docMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Build weekly consultation trend strictly from actual appointment dates
    const dayBuckets: { [key: string]: number } = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    appointments.forEach((app) => {
      const d = new Date(app.date || app.createdAt || Date.now());
      const dayName = days[d.getDay()];
      if (dayBuckets[dayName] !== undefined) {
        dayBuckets[dayName]++;
      }
    });

    const trendData = Object.keys(dayBuckets).map((day) => ({
      day,
      consults: dayBuckets[day],
    }));

    return {
      total,
      onDuty,
      available,
      busy,
      avgConsultations,
      topDoctors,
      trendData,
    };
  }, [doctors, appointments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Doctor Analytics</h3>
            <p className="text-xs text-slate-500">Duty roster, consultation throughput, and doctor performance</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Doctors</span>
          <p className="mt-2 text-2xl font-extrabold text-navy-900">{metrics.total}</p>
          <span className="text-[11px] text-slate-400">Registered Specialists</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Doctors On Duty</span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{metrics.onDuty}</p>
          <span className="text-[11px] text-slate-400">Shift Active</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Doctors Available</span>
          <p className="mt-2 text-2xl font-extrabold text-blue-600">{metrics.available}</p>
          <span className="text-[11px] text-slate-400">Ready for OP</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Doctors Busy</span>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">{metrics.busy}</p>
          <span className="text-[11px] text-slate-400">In Consultation / OT</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Avg Consultations</span>
          <p className="mt-2 text-2xl font-extrabold text-purple-600">{metrics.avgConsultations}</p>
          <span className="text-[11px] text-slate-400">Per Doctor / Total</span>
        </div>
      </div>

      {/* Grid: Consultation Trend + Top Doctors Leaderboard */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Consultation Trend (Line Chart) */}
        <div className="lg:col-span-2">
          <ChartCard title="Weekly Consultation Volume Trend" subtitle="Daily consultations completed by doctors">
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="consults" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: "#4f46e5" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Top Doctors Leaderboard */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-500" /> Top Performing Doctors
            </h4>
            <span className="text-xs text-slate-400">Volume</span>
          </div>

          <div className="space-y-3">
            {metrics.topDoctors.length === 0 ? (
              <p className="text-xs text-slate-400">No consultations logged yet.</p>
            ) : (
              metrics.topDoctors.map((doc, idx) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600'}`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{doc.name}</p>
                      <p className="text-[10px] text-slate-400">{doc.dept}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-extrabold text-navy-700">
                    {doc.count} consults
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
