import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Activity,
  BedDouble,
  CalendarClock,
  Scissors,
  Video,
  Plus,
  Clock,
  User,
  ChevronRight,
  Stethoscope,
  CheckCircle2,
  Bell,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  AlertOctagon,
  Calendar,
  Zap,
  Info,
  ShieldCheck,
  Percent,
  MessageSquare,
  Award,
  RefreshCw,
  UserPlus,
  UserCheck,
  Sparkles
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  CartesianGrid
} from "recharts";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";
import {
  useDoctorDashboardAnalytics,
  useDoctorTodayAppointments
} from "../../features/doctorDashboard";
import { mapAppointmentTypeForDisplay } from "../../features/appointments";
import { useSocketSync } from "../../hooks/useSocketSync";

const STATUS_BADGE: Record<string, { tone: "success" | "warning" | "info" | "neutral" | "danger"; label: string }> = {
  pending_payment: { tone: "danger",   label: "Pending Payment" },
  completed:       { tone: "success",  label: "Completed"       },
  in_consultation: { tone: "warning",  label: "In Consultation" },
  checked_in:      { tone: "info",     label: "Checked In"      },
  scheduled:       { tone: "neutral",  label: "Scheduled"       },
  cancelled:       { tone: "danger",   label: "Cancelled"       },
  no_show:         { tone: "danger",   label: "No Show"         },
};

const CHART_COLORS = {
  navy: ["#16a34a", "#15803d", "#22c55e", "#4ade80", "#86efac"],
  emerald: ["#16a34a", "#15803d", "#22c55e", "#4ade80", "#86efac"],
  amber: ["#d97706", "#f59e0b", "#fbbf24", "#fcd34d", "#fef3c7"],
  rose: ["#e11d48", "#f43f5e", "#fb7185", "#fda4af", "#ffe4e6"],
  indigo: ["#15803d", "#16a34a", "#e11d48", "#f43f5e", "#86efac"],
};

// Premium Floating Tooltip Component
const CustomTooltip = React.memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl text-slate-900 text-xs space-y-1.5 z-50 pointer-events-none">
        {label && <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-1 mb-1 font-sans">{label}</p>}
        <div className="space-y-1">
          {payload.map((pld: any, idx: number) => {
            const color = pld.color || pld.fill || "#4f46e5";
            const name = pld.name || pld.dataKey || "Count";
            return (
              <div key={idx} className="flex items-center justify-between gap-4 font-semibold font-sans">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-slate-700">{name}:</span>
                </div>
                <span className="font-black text-slate-900">{pld.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = "CustomTooltip";

// Tiny Sparkline Component (Linear path)
const Sparkline = React.memo(({ data, color = "#1e3a8a" }: { data: number[]; color?: string }) => {
  const chartData = useMemo(() => data.map((val, idx) => ({ id: idx, value: val })), [data]);
  return (
    <div className="h-6 w-16 sm:w-20 shrink-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={chartData} margin={{ top: 2, bottom: 2, left: 2, right: 2 }}>
          <Line type="linear" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
Sparkline.displayName = "Sparkline";

export function DoctorDashboard() {
  useSocketSync();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<string>("7days");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [growthTab, setGrowthTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [chartType, setChartType] = useState<"area" | "line">("area");

  // Fetch real aggregated analytics from the backend
  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isError: isAnalyticsError,
    refetch: refetchAnalytics
  } = useDoctorDashboardAnalytics({
    range: dateRange,
    startDate: customStartDate,
    endDate: customEndDate
  });

  // Fetch today's schedule for layout list
  const { data: appointments, isLoading: isApptsLoading } = useDoctorTodayAppointments();

  const handleQuickAction = (actionType: "prescription" | "history" | "lab" | "documents") => {
    const targetAppt = appointments?.find(a => a.status === "in_consultation");
    if (!targetAppt) {
      toast.error("No active consultation in progress. Redirecting to OP Queue to select patient.");
      navigate("/doctor/op-management");
      return;
    }
    navigate(`/doctor/consultation/${targetAppt._id}`, { state: { activeTab: actionType } });
  };

  // Group appointments into Morning, Afternoon, Evening
  const groupedSchedule = useMemo(() => {
    if (!appointments) return { morning: [], afternoon: [], evening: [] };
    const morning: any[] = [];
    const afternoon: any[] = [];
    const evening: any[] = [];

    appointments.forEach((appt) => {
      const timeStr = appt.time || "09:00";
      const hour = parseInt(timeStr.split(":")[0], 10);
      if (hour < 12) {
        morning.push(appt);
      } else if (hour < 17) {
        afternoon.push(appt);
      } else {
        evening.push(appt);
      }
    });

    return { morning, afternoon, evening };
  }, [appointments]);

  // Doctor Patient Acquisition & Revisit Analytics Computation (Doctor Practice-wide Stats)
  const doctorRevisitMetrics = useMemo(() => {
    if (analytics?.revisitAnalytics) {
      const {
        total,
        newPatients,
        revisitPatients,
        newPct,
        revisitPct,
        singleVisit,
        regularVisits,
        frequentVisits,
      } = analytics.revisitAnalytics;

      const pieData = [
        { name: "First Visit (New Patients)", value: newPatients, fill: "#10b981" },
        { name: "Revisit Consults (Returning)", value: revisitPatients, fill: "#6366f1" },
      ];

      return {
        total,
        newCount: newPatients,
        revisitCount: revisitPatients,
        newPct,
        revisitPct,
        singleVisit: singleVisit || Math.round(total * 0.4),
        regularVisits: regularVisits || Math.round(total * 0.4),
        frequentVisits: frequentVisits || Math.round(total * 0.2),
        pieData,
      };
    }

    // Fallback if backend analytics object is loading
    const allAppts = appointments || [];
    let newCount = 0;
    let revisitCount = 0;

    const patientApptCounts = new Map<string, number>();
    allAppts.forEach((app: any) => {
      const pId = typeof app.patient === "object" ? app.patient?._id?.toString() : app.patient?.toString();
      if (pId) {
        patientApptCounts.set(pId, (patientApptCounts.get(pId) || 0) + 1);
      }
    });

    allAppts.forEach((app: any) => {
      const pObj = typeof app.patient === "object" ? app.patient : null;
      const pId = pObj?._id?.toString() || (typeof app.patient === "string" ? app.patient : "");

      const count = pId ? (patientApptCounts.get(pId) || 1) : 1;
      const medHistCount = Array.isArray(pObj?.medicalHistory) ? pObj.medicalHistory.length : 0;
      const visitCount = pObj?.visitCount || 1;
      
      const apptDateStr = new Date(app.date || app.createdAt || Date.now()).toDateString();
      const pCreatedStr = pObj?.createdAt ? new Date(pObj.createdAt).toDateString() : apptDateStr;
      const isRegisteredPrior = pCreatedStr !== apptDateStr;

      const isExplicitFollowUp = app.type === "Follow-up" || app.type === "Revisit" || app.followUp === true || app.isRevisit === true;

      const isRevisit = count > 1 || medHistCount > 0 || visitCount > 1 || isRegisteredPrior || isExplicitFollowUp;

      if (isRevisit) {
        revisitCount++;
      } else {
        newCount++;
      }
    });

    const total = Math.max(1, newCount + revisitCount);
    const newPct = total > 0 ? Math.round((newCount / total) * 100) : 0;
    const revisitPct = total > 0 ? Math.round((revisitCount / total) * 100) : 0;

    const pieData = [
      { name: "First Visit (New Patients)", value: newCount, fill: "#10b981" },
      { name: "Revisit Consults (Returning)", value: revisitCount, fill: "#6366f1" },
    ];

    return {
      total,
      newCount,
      revisitCount,
      newPct,
      revisitPct,
      singleVisit: newCount,
      regularVisits: Math.round(revisitCount * 0.7),
      frequentVisits: Math.round(revisitCount * 0.3),
      pieData,
    };
  }, [appointments, analytics]);

  const isLoading = isAnalyticsLoading || isApptsLoading;

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent"></div>
          <p className="text-xs text-slate-500 font-medium">Aggregating Clinical Analytics...</p>
        </div>
      </div>
    );
  }

  const metrics = analytics?.metrics;

  return (
    <div className="space-y-6">
      {/* Top Controls & Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-sans tracking-tight">Clinical Analytics Cockpit</h1>
          <p className="text-sm text-slate-500 font-sans">Good Morning, Dr. {user?.name ?? "Doctor"} · Overview of your medical registry</p>
        </div>

        {/* Date Filters & Quick Actions in One Line */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 max-w-full">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shrink-0 overflow-x-auto max-w-full scrollbar-none">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7days", label: "7 Days" },
              { id: "30days", label: "30 Days" },
              { id: "month", label: "Month" },
              { id: "custom", label: "Custom" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDateRange(f.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all font-sans whitespace-nowrap ${
                  dateRange === f.id
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 shrink-0">
            <Link to="/doctor/telemedicine">
              <button className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap font-sans">
                <Video className="h-3.5 w-3.5" /> Video Consult
              </button>
            </Link>
            <Link to="/doctor/op-management">
              <button className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap font-sans">
                <Plus className="h-3.5 w-3.5" /> New Consultation
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Custom Date Input Panel */}
      {dateRange === "custom" && (
        <Card className="flex flex-wrap items-center gap-4 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-extrabold text-slate-600 font-sans">Start Date:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500 font-sans"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-extrabold text-slate-600 font-sans">End Date:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500 font-sans"
            />
          </div>
        </Card>
      )}

      {/* API Failure Alert Banner */}
      {isAnalyticsError && (
        <Card className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl gap-3">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-rose-900 font-sans">Unable to load real-time analytics data</p>
              <p className="text-[11px] text-rose-600 font-sans">A network or server error occurred while fetching metrics. Displayed counts may be unavailable.</p>
            </div>
          </div>
          <button
            onClick={() => refetchAnalytics()}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 font-sans"
          >
            <RefreshCw className="h-3 w-3" /> Retry Analytics
          </button>
        </Card>
      )}

      {/* SECTION 1: TOP SUMMARY CARDS (Responsive: 1 col on mobile, 2 on tablet, 4 cols on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Today's Appointments",
            data: metrics?.todayAppointments,
            icon: <Activity className="h-4 w-4" />,
            color: "stroke-emerald-600 bg-emerald-50 text-emerald-700",
            to: "/doctor/appointments/today"
          },
          {
            label: "Waiting Patients",
            data: metrics?.waitingPatients,
            icon: <User className="h-4 w-4" />,
            color: "stroke-amber-600 bg-amber-50 text-amber-700",
            to: "/doctor/queue"
          },
          {
            label: "Current Inpatients",
            data: metrics?.currentInpatients,
            icon: <BedDouble className="h-4 w-4" />,
            color: "stroke-emerald-600 bg-emerald-50 text-emerald-700",
            to: "/doctor/inpatients"
          },
          {
            label: "Today's Surgeries",
            data: metrics?.todaySurgeries,
            icon: <Scissors className="h-4 w-4" />,
            color: "stroke-red-600 bg-red-50 text-red-700",
            to: "/doctor/surgeries"
          },
          {
            label: "Completed Consultations",
            data: metrics?.completedConsultations,
            icon: <CheckCircle2 className="h-4 w-4" />,
            color: "stroke-green-600 bg-emerald-100/50 text-emerald-800",
            to: "/doctor/consultations/completed"
          },
          {
            label: "Pending Prescriptions",
            data: metrics?.pendingPrescriptions,
            icon: <Clock className="h-4 w-4" />,
            color: "stroke-indigo-600 bg-indigo-50 text-indigo-700",
            to: "/doctor/prescriptions/pending"
          },
          {
            label: "Pending Lab Orders",
            data: metrics?.pendingLabOrders,
            icon: <Stethoscope className="h-4 w-4" />,
            color: "stroke-purple-600 bg-purple-50 text-purple-700",
            to: "/doctor/laboratory/pending"
          },
          {
            label: "Follow-up Patients",
            data: metrics?.followupPatients,
            icon: <UserCheck className="h-4 w-4" />,
            color: "stroke-teal-600 bg-teal-50 text-teal-700",
            to: "/doctor/followups"
          }
        ].map((card) => {
          const isNum = typeof card.data?.current === "number" && !isNaN(card.data.current);
          const currentVal = isAnalyticsError ? "—" : (isNum ? card.data.current : 0);
          const diff = typeof card.data?.todayDiff === "number" && !isNaN(card.data.todayDiff) ? card.data.todayDiff : 0;
          const sparklineArr = card.data?.sparkline ?? [0, 0, 0, 0, 0, 0, 0];
          const isUp = diff >= 0;

          return (
            <Link key={card.label} to={card.to} className="block no-underline text-inherit hover:scale-[1.01] transition-transform duration-200">
              <Card className="flex flex-col justify-between p-3 h-full relative overflow-hidden border border-slate-100 hover:border-slate-200 shadow-sm hover:shadow transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-sans">{card.label}</p>
                    <p className="text-xl font-black text-slate-800 font-sans">{currentVal}</p>
                  </div>
                  <div className={`rounded-lg p-1.5 ${card.color}`}>
                    {card.icon}
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {isUp ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-rose-500" />
                    )}
                    <span className={`text-xs font-extrabold font-sans ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                      {isUp ? "+" : ""}{diff}
                    </span>
                    <span className="text-[9px] text-slate-400 font-extrabold font-sans">vs yesterday</span>
                  </div>

                  <Sparkline data={sparklineArr} color={isUp ? "#10b981" : "#f43f5e"} />
                </div>
                <div className="mt-1 text-[9px] text-slate-400 border-t border-slate-50 pt-0.5 flex justify-between font-sans">
                  <span>Weekly diff: {card.data?.weeklyDiff ?? 0}</span>
                  <span>Updated: Live</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* TODAY'S CLINICAL SCHEDULE & QUICK CLINICAL ACTIONS (Responsive: 1 col on mobile, 3 cols on desktop) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Grouped Schedule */}
        <Card className="lg:col-span-2 hover:border-slate-200 transition-all duration-300">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 font-sans">
              <Calendar className="h-4 w-4 text-emerald-700" /> Today's Clinical Schedule
            </h3>
            <Link to="/doctor/appointments/today" className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline font-sans">
              Full list <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {appointments && appointments.length > 0 ? (
            <div className="space-y-4">
              {/* Group slots */}
              {["Morning Slots", "Afternoon Slots", "Evening Slots"].map((groupName) => {
                let slotList: any[] = [];
                if (groupName.startsWith("Morning")) slotList = groupedSchedule.morning;
                else if (groupName.startsWith("Afternoon")) slotList = groupedSchedule.afternoon;
                else slotList = groupedSchedule.evening;

                if (slotList.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 border-b border-slate-100 pb-1 font-sans">{groupName}</p>
                    <div className="space-y-2">
                      {slotList.map((appt) => {
                        const p = appt.patient as any;
                        const patientName = p?.name || "Unknown Patient";
                        const initials = patientName.split(" ").map((n: string) => n[0]).join("").slice(0, 2);
                        const time = appt.time;
                        const type = mapAppointmentTypeForDisplay(appt.type);
                        const token = appt.referenceId || appt._id.slice(-6);

                        const isCritical = appt.type?.toLowerCase() === "emergency";
                        const isVIP = appt.notes?.toLowerCase().includes("vip");

                        return (
                          <div
                            key={appt._id}
                            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-slate-50 ${
                              appt.status === "in_consultation"
                                ? "border-amber-200 bg-amber-50"
                                : isCritical
                                ? "border-red-200 bg-red-50/50"
                                : "border-slate-100"
                            }`}
                          >
                            <div className="w-12 shrink-0">
                              <p className="text-xs font-black text-emerald-700 font-sans">{time}</p>
                            </div>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 font-sans">
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-800 truncate font-sans">{patientName}</p>
                                {isCritical && (
                                  <span className="rounded bg-red-600 px-1 py-0.5 text-[8px] font-black text-white uppercase animate-pulse font-sans">Critical</span>
                                )}
                                {isVIP && (
                                  <span className="rounded bg-amber-500 px-1 py-0.5 text-[8px] font-black text-white uppercase font-sans">VIP</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-extrabold font-sans">{type} · Token: {token}</p>
                            </div>
                            <Badge tone={STATUS_BADGE[appt.status]?.tone || "neutral"}>
                              {STATUS_BADGE[appt.status]?.label || appt.status}
                            </Badge>
                            {["scheduled", "checked_in", "in_consultation"].includes(appt.status) && (
                              <Link to={`/doctor/consultation/${appt._id}`}>
                                <button className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-800 transition-colors font-sans">
                                  Open
                                </button>
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <CalendarClock className="mb-2 h-8 w-8 text-slate-400" />
              <p className="text-xs font-bold text-slate-600 font-sans">No Appointments Booked</p>
              <p className="text-[10px] text-slate-400 font-sans">There are no consultations scheduled for you today.</p>
            </div>
          )}
        </Card>

        {/* Quick Clinical Actions & Notifications Side Block */}
        <div className="space-y-6">
          {/* Quick Actions (Section 15) */}
          <Card className="hover:border-slate-200 transition-all duration-300">
            <h3 className="mb-3 text-sm font-bold text-slate-800 font-sans">Quick Clinical Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "New Prescription",     type: "prescription", icon: <Plus className="h-3.5 w-3.5" /> },
                { label: "Patient History",      type: "history",      icon: <User className="h-3.5 w-3.5" /> },
                { label: "Create Lab Order",     type: "lab",          icon: <Stethoscope className="h-3.5 w-3.5" /> },
                { label: "Medical Certificate",  type: "documents",    icon: <FileText className="h-3.5 w-3.5" /> },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.type as any)}
                  className="flex flex-col gap-1 items-center justify-center rounded-lg border border-slate-200 p-3 text-slate-700 hover:bg-slate-50 hover:border-slate-350 transition-all text-center focus:outline-none"
                >
                  <div className="rounded-full bg-slate-100 p-2 text-emerald-700">{action.icon}</div>
                  <span className="text-[10px] font-extrabold mt-1 text-slate-600 font-sans">{action.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Clinical Alerts Card */}
          <Card className="hover:border-slate-200 transition-all duration-300">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1 font-sans">
                <Bell className="h-4 w-4 text-rose-600" /> Clinical Notifications
              </h3>
              <Link to="/doctor/notifications" className="text-xs font-bold text-emerald-700 hover:underline font-sans">
                View ({analytics?.metrics?.notifications?.current ?? 0})
              </Link>
            </div>
            <Link to="/doctor/notifications" className="block text-slate-700 hover:bg-slate-50 transition-colors border border-slate-100 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-rose-50 text-rose-600 shrink-0">
                  <Bell className="h-4 w-4 animate-bounce" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 font-sans">You have {analytics?.metrics?.notifications?.current ?? 0} active alerts</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Click to view critical laboratory tests or verification notices.</p>
                </div>
              </div>
            </Link>
          </Card>
        </div>
      </div>

      {/* DOCTOR PATIENT ACQUISITION & REVISIT ANALYTICS (LIGHT THEME) */}
      <Card className="hover:border-slate-200 transition-all duration-300">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 border border-indigo-200/60">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 font-sans">Doctor Practice Patient Acquisition & Revisit Analytics</h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 font-sans">
                  Total Practice Data
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">Comprehensive practice metrics: first-time consultations vs returning follow-up patients</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium font-sans">Doctor Retention Index:</span>
            <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 border border-indigo-200 font-sans">
              {doctorRevisitMetrics.revisitPct}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Donut Chart */}
          <div className="lg:col-span-1 rounded-xl border border-slate-100 bg-slate-50/50 p-3 flex flex-col items-center justify-center relative">
            <div className="h-44 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={doctorRevisitMetrics.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#6366f1" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none text-center select-none z-10">
                <span className="text-2xl font-black text-slate-900 leading-none font-sans">{doctorRevisitMetrics.total}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-1 font-sans">Patients</span>
              </div>
            </div>
            <div className="flex justify-center gap-3 text-[11px] font-bold mt-1 font-sans">
              <span className="text-emerald-600 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> New: {doctorRevisitMetrics.newCount}</span>
              <span className="text-indigo-600 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Revisit: {doctorRevisitMetrics.revisitCount}</span>
            </div>
          </div>

          {/* 2 Stat Highlights & Loyalty Distribution */}
          <div className="lg:col-span-2 flex flex-col justify-between gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400 font-sans">First-Time New Patients</span>
                  <div className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-600">
                    <UserPlus className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-600 mt-2 font-sans">{doctorRevisitMetrics.newCount}</p>
                <p className="text-[11px] text-slate-400 font-sans mt-1">{doctorRevisitMetrics.newPct}% new practice acquisitions</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400 font-sans">Returning Revisit Patients</span>
                  <div className="p-1.5 rounded-lg bg-indigo-100/80 text-indigo-600">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-indigo-600 mt-2 font-sans">{doctorRevisitMetrics.revisitCount}</p>
                <p className="text-[11px] text-slate-400 font-sans mt-1">{doctorRevisitMetrics.revisitPct}% returning follow-ups</p>
              </div>
            </div>

            {/* Practice Frequency Loyalty Segmentation */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
              <div className="rounded-lg border border-slate-100 bg-slate-50/40 p-2 text-center">
                <p className="text-[10px] font-bold text-slate-400 font-sans">Single Visit (1st Time)</p>
                <p className="text-sm font-extrabold text-slate-800 font-sans mt-0.5">{doctorRevisitMetrics.singleVisit}</p>
                <p className="text-[9px] text-slate-400 font-sans">New Patients</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/40 p-2 text-center">
                <p className="text-[10px] font-bold text-indigo-600 font-sans">Regular (2-3 Visits)</p>
                <p className="text-sm font-extrabold text-indigo-700 font-sans mt-0.5">{doctorRevisitMetrics.regularVisits}</p>
                <p className="text-[9px] text-slate-400 font-sans">Follow-up Consults</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/40 p-2 text-center">
                <p className="text-[10px] font-bold text-purple-600 font-sans">Frequent (4+ Visits)</p>
                <p className="text-sm font-extrabold text-purple-700 font-sans mt-0.5">{doctorRevisitMetrics.frequentVisits}</p>
                <p className="text-[9px] text-slate-400 font-sans">Loyal Patients</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* SECTIONS 2 & 3: PATIENT GROWTH & ANALYTICS (Responsive: 1 col on mobile, 3 cols on desktop) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Patient Demographics / Patient Type Split */}
        <Card className="min-w-0 flex flex-col justify-between hover:border-slate-200 transition-all duration-300">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5 font-sans">
              <Users className="h-4 w-4 text-emerald-600" /> Patient Segment Analytics
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Patient categories distribution</p>
          </div>

          {((analytics?.patientAnalytics?.types ?? []).reduce((acc: number, curr: any) => acc + (curr.value || 0), 0) > 0) ? (
            <>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={analytics?.patientAnalytics?.types ?? []}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    >
                      {(analytics?.patientAnalytics?.types ?? []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS.navy[index % CHART_COLORS.navy.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Details & Percentage Summary */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {(analytics?.patientAnalytics?.types ?? []).map((t: any) => {
                  const totalVal = (analytics?.patientAnalytics?.types ?? []).reduce((acc: number, curr: any) => acc + (curr.value || 0), 0) || 1;
                  const pct = Math.round(((t.value || 0) / totalVal) * 100);
                  return (
                    <div key={t.name} className="rounded-lg border border-slate-100 p-2 text-center bg-slate-50/50">
                      <p className="text-[10px] font-extrabold text-slate-400 truncate font-sans">{t.name}</p>
                      <p className="text-sm font-black text-slate-700 font-sans">{pct}%</p>
                      <p className="text-[9px] text-slate-400 font-sans">{t.value || 0} cases</p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed border-slate-100 bg-slate-50/40 my-auto">
              <Users className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-xs font-bold text-slate-500 font-sans">No Segment Records</p>
              <p className="text-[10px] text-slate-400 font-sans">No patient category data found for this period.</p>
            </div>
          )}
        </Card>

        {/* Patient Growth Trend Line/Area Chart */}
        <Card className="min-w-0 lg:col-span-2 flex flex-col justify-between hover:border-slate-200 transition-all duration-300">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                <TrendingUp className="h-4 w-4 text-emerald-600" /> Patient Registry Trend
              </h3>
              <p className="text-xs text-slate-400 font-sans">Chronological analysis of consult growth</p>
            </div>

            {/* Growth Chart Controls */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
                {(["daily", "weekly", "monthly"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setGrowthTab(tab)}
                    className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all font-sans ${
                      growthTab === tab ? "bg-white text-emerald-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
                {(["area", "line"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all font-sans ${
                      chartType === type ? "bg-white text-emerald-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {chartType === "area" ? (
                <AreaChart data={analytics?.growthTrend?.[growthTab] ?? []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dy={8} minTickGap={15} />
                  <YAxis stroke="#94a3b8" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dx={-8} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Completed Consults"
                    stroke="#1e3a8a"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#growthGrad)"
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              ) : (
                <LineChart data={analytics?.growthTrend?.[growthTab] ?? []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dy={8} minTickGap={15} />
                  <YAxis stroke="#94a3b8" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dx={-8} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Completed Consults"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, stroke: "#10b981", strokeWidth: 1.5, fill: "#fff" }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* SECTIONS 4, 5, 6: CLINICAL LOGISTICS & DIAGNOSTICS (Responsive: 1 col on mobile, 2 on tablet, 3 on desktop) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Consultation Logistics */}
        <Card className="min-w-0 flex flex-col justify-between hover:border-slate-200 transition-all duration-300">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5 font-sans">
              <Zap className="h-4 w-4 text-amber-500" /> Consultation Analytics
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Consult lifecycle & timings</p>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={[
                  { name: "Completed", count: analytics?.consultationAnalytics?.completed ?? 0, fill: "#10b981" },
                  { name: "Pending", count: analytics?.consultationAnalytics?.pending ?? 0, fill: "#3660bf" },
                  { name: "Rescheduled", count: analytics?.consultationAnalytics?.rescheduled ?? 0, fill: "#fbbf24" },
                  { name: "Cancelled", count: analytics?.consultationAnalytics?.cancelled ?? 0, fill: "#f43f5e" }
                ]}
                margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="#94a3b8" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dx={-8} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000}>
                  {[
                    { fill: "#10b981" },
                    { fill: "#3660bf" },
                    { fill: "#fbbf24" },
                    { fill: "#f43f5e" }
                  ].map((entry, index) => (
                    <Cell key={`cell-consult-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-100 p-2 text-center bg-slate-50/50">
              <p className="text-[10px] font-extrabold text-slate-400 font-sans">Avg Duration</p>
              <p className="text-base font-black text-slate-700 font-sans">{analytics?.consultationAnalytics?.avgDuration ?? 15} mins</p>
            </div>
            <div className="rounded-lg border border-slate-100 p-2 text-center bg-slate-50/50">
              <p className="text-[10px] font-extrabold text-slate-400 font-sans">Avg Wait Time</p>
              <p className="text-base font-black text-slate-700 font-sans">{analytics?.consultationAnalytics?.avgWaitingTime ?? 12} mins</p>
            </div>
          </div>
        </Card>

        {/* Laboratory Statistics */}
        <Card className="min-w-0 flex flex-col justify-between hover:border-slate-200 transition-all duration-300">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5 font-sans">
              <Stethoscope className="h-4 w-4 text-purple-600" /> Lab Investigations
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Urgent tests & turnarounds</p>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={[
                  { name: "Pending", count: analytics?.laboratoryAnalytics?.pending ?? 0, fill: "#3660bf" },
                  { name: "Completed", count: analytics?.laboratoryAnalytics?.completed ?? 0, fill: "#10b981" },
                  { name: "Critical", count: analytics?.laboratoryAnalytics?.critical ?? 0, fill: "#e11d48" },
                  { name: "Rejected", count: analytics?.laboratoryAnalytics?.rejected ?? 0, fill: "#f59e0b" }
                ]}
                margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="#94a3b8" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dx={-8} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000}>
                  {(
                    [
                      { name: "Pending", fill: "#3660bf" },
                      { name: "Completed", fill: "#10b981" },
                      { name: "Critical", fill: "#e11d48" },
                      { name: "Rejected", fill: "#f59e0b" }
                    ]
                  ).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 rounded-lg border border-slate-100 p-2 flex justify-between items-center bg-slate-50/50">
            <span className="text-[10px] font-extrabold text-slate-400 font-sans">Avg Report TAT:</span>
            <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-sans">{analytics?.laboratoryAnalytics?.avgReportTime ?? "2.5h"}</span>
          </div>
        </Card>

        {/* Radiology Scans (Tablet: Spans 2 columns on Row 2; Desktop: standard 1 column layout) */}
        <Card className="min-w-0 flex flex-col justify-between hover:border-slate-200 transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5 font-sans">
              <AlertOctagon className="h-4 w-4 text-rose-500" /> Radiology Turnaround
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Imaging & scan queue distribution</p>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                layout="vertical"
                data={[
                  { name: "Pending", count: analytics?.radiologyAnalytics?.pending ?? 0, fill: "#8aa8e1" },
                  { name: "Completed", count: analytics?.radiologyAnalytics?.completed ?? 0, fill: "#34d399" },
                  { name: "STAT/Critical", count: analytics?.radiologyAnalytics?.critical ?? 0, fill: "#fb7185" }
                ]}
                margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dy={8} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dx={-8} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={1000}>
                  {(
                    [
                      { name: "Pending", fill: "#8aa8e1" },
                      { name: "Completed", fill: "#34d399" },
                      { name: "STAT/Critical", fill: "#fb7185" }
                    ]
                  ).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 rounded-lg border border-slate-100 p-2 flex justify-between items-center bg-slate-50/50">
            <span className="text-[10px] font-extrabold text-slate-400 font-sans">Avg Scan Time:</span>
            <span className="text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-sans">{analytics?.radiologyAnalytics?.avgProcessingTime ?? "3.2h"}</span>
          </div>
        </Card>
      </div>

      {/* SECTIONS 7, 8, 9, 10: CLINICAL CORE MATRIX (Responsive: 1 col on mobile, 2 on tablet, 4 on desktop) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Disease Analytics */}
        <Card className="min-w-0 flex flex-col justify-between hover:border-slate-200 transition-all duration-300">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5 font-sans">
              <Stethoscope className="h-4 w-4 text-rose-600" /> Diagnoses Breakdown
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Top pathologies in last 30 days</p>
          </div>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={analytics?.diseaseAnalytics?.topDiseases ?? []}
                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={7} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dy={8} minTickGap={10} />
                <YAxis stroke="#94a3b8" fontSize={8} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dx={-8} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#fb7185" radius={[3, 3, 0, 0]} isAnimationActive={true} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-[9px] text-slate-500 font-extrabold space-y-1 font-sans font-sans">
            <p className="font-extrabold text-slate-600 border-b border-slate-100 pb-0.5">Top Symptoms Logged</p>
            {(analytics?.diseaseAnalytics?.topSymptoms ?? []).slice(0, 3).map((s: any) => (
              <div key={s.name} className="flex justify-between">
                <span>{s.name}</span>
                <span className="text-slate-800">{s.value} incidents</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Prescription categories */}
        <Card className="min-w-0 flex flex-col justify-between hover:border-slate-200 transition-all duration-300">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5 font-sans">
              <FileText className="h-4 w-4 text-emerald-700" /> Prescriptions Issued
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Therapeutic categories split</p>
          </div>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={analytics?.prescriptionAnalytics?.categories ?? []}
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  dataKey="value"
                  label={({ name, percent }) => `${name.substring(0, 5)} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                  fontSize={8}
                  isAnimationActive={true}
                  animationDuration={1000}
                >
                  {(analytics?.prescriptionAnalytics?.categories ?? []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS.indigo[index % CHART_COLORS.indigo.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-[10px] text-slate-500 font-extrabold space-y-1 font-sans">
            <div className="flex justify-between border-b border-slate-50 pb-1">
              <span className="text-slate-400">Today's Prescriptions:</span>
              <span className="font-extrabold text-slate-800">{analytics?.prescriptionAnalytics?.todayPrescriptions ?? 0}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-1">
              <span className="text-slate-400">Pending pharmacy split:</span>
              <span className="font-extrabold text-amber-600">{analytics?.prescriptionAnalytics?.pending ?? 0}</span>
            </div>
          </div>
        </Card>

        {/* Follow-up Calendar */}
        <Card className="min-w-0 flex flex-col justify-between hover:border-slate-200 transition-all duration-300">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5 font-sans">
              <Calendar className="h-4 w-4 text-teal-600" /> Follow-up Calendar
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Retention & return slots</p>
          </div>

          <div className="space-y-3">
            {[
              { label: "Today's Follow-ups", val: analytics?.followupAnalytics?.today ?? 0, color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
              { label: "Missed Follow-ups", val: analytics?.followupAnalytics?.missed ?? 0, color: "text-rose-600 bg-rose-50 border-rose-100" },
              { label: "Upcoming Follow-ups", val: analytics?.followupAnalytics?.upcoming ?? 0, color: "text-emerald-700 bg-emerald-50 border-emerald-100" }
            ].map((f) => (
              <div key={f.label} className={`flex items-center justify-between rounded-lg border p-2.5 ${f.color} transition-all duration-350 hover:shadow-sm`}>
                <span className="text-xs font-bold font-sans">{f.label}</span>
                <span className="text-sm font-black font-sans">{f.val}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 text-[9px] text-slate-400 border-t border-slate-50 pt-2 flex justify-between font-sans">
            <span>Completed follows (30d): {analytics?.followupAnalytics?.completed ?? 0}</span>
            <span className="font-extrabold text-teal-600 font-sans">Active</span>
          </div>
        </Card>

        {/* Demographics Donuts */}
        <Card className="min-w-0 flex flex-col justify-between hover:border-slate-200 transition-all duration-300">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5 font-sans">
              <Users className="h-4 w-4 text-emerald-600" /> Gender & Age Group
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Demographics structure</p>
          </div>

          <div className="h-40 flex items-center justify-around">
            {/* Gender donut */}
            <div className="h-28 w-28 relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={analytics?.demographics?.gender ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={1000}
                  >
                    {(analytics?.demographics?.gender ?? []).map((entry: any, idx: number) => (
                      <Cell key={`cell-gender-${idx}`} fill={CHART_COLORS.emerald[idx % CHART_COLORS.emerald.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[8px] font-extrabold text-slate-400 uppercase font-sans">Gender</span>
              </div>
            </div>

            {/* Age donut */}
            <div className="h-28 w-28 relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={analytics?.demographics?.ageGroups ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={1000}
                  >
                    {(analytics?.demographics?.ageGroups ?? []).map((entry: any, idx: number) => (
                      <Cell key={`cell-age-${idx}`} fill={CHART_COLORS.navy[idx % CHART_COLORS.navy.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[8px] font-extrabold text-slate-400 uppercase font-sans">Age</span>
              </div>
            </div>
          </div>

          <div className="text-[9px] text-slate-400 grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-50 font-sans">
            <div>
              <p className="font-extrabold text-slate-500">Gender Ratio</p>
              {(analytics?.demographics?.gender ?? []).map((g: any) => (
                <div key={g.name} className="flex justify-between">
                  <span>{g.name}:</span> <span className="font-extrabold text-slate-700">{g.value}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="font-extrabold text-slate-500">Age Cohorts</p>
              {(analytics?.demographics?.ageGroups ?? []).map((a: any) => (
                <div key={a.name} className="flex justify-between">
                  <span>{a.name}:</span> <span className="font-extrabold text-slate-700">{a.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* SECTION 11 & 12 & 13: PERFORMANCE COCKPIT, BOOKING CHANNELS & LIVE ACTIVITY (Responsive: 1 col on mobile, 3 on desktop) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* SECTION 13: LIVE AUDIT FEED */}
        <Card className="min-w-0 flex flex-col justify-between hover:border-slate-200 transition-all duration-300">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5 font-sans">
              <Info className="h-4 w-4 text-emerald-700" /> Live Audit Feed
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Socket.IO real-time activity tracker</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 border-t border-slate-50 pt-2 max-h-[220px]">
            {analytics?.timeline && analytics.timeline.length > 0 ? (
              analytics.timeline.map((event: any, index: number) => (
                <div key={index} className="flex gap-3 text-left">
                  <div className="relative flex flex-col items-center">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      event.type === "appointment" ? "bg-emerald-600" :
                      event.type === "consultation" ? "bg-emerald-700" :
                      event.type === "prescription" ? "bg-rose-600" :
                      event.type === "lab" ? "bg-amber-600" :
                      "bg-slate-600"
                    }`} />
                    {index < analytics.timeline.length - 1 && (
                      <div className="w-0.5 bg-slate-100 flex-1 my-1" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-slate-700 truncate font-sans">{event.title}</p>
                      <span className="text-[8px] text-slate-400 font-semibold font-sans">
                        {new Date(event.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5 leading-tight font-sans">{event.desc}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center py-6">
                <ShieldCheck className="h-6 w-6 text-slate-350 mb-1.5" />
                <p className="text-[10px] font-bold text-slate-400 font-sans">Waiting for live events...</p>
              </div>
            )}
          </div>
        </Card>

        {/* Doctor Performance Evaluation */}
        <Card className="min-w-0 flex flex-col justify-between hover:border-slate-200 transition-all duration-300">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5 font-sans">
              <Award className="h-4 w-4 text-emerald-700" /> Performance Index
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Clinical score breakdown</p>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                { subject: "Satisfaction", A: analytics?.performance?.patientSatisfaction ?? 95, fullMark: 100 },
                { subject: "Lab Filled", A: analytics?.performance?.labRequestCompletion ?? 90, fullMark: 100 },
                { subject: "Prescriptions", A: analytics?.performance?.prescriptionCompletion ?? 92, fullMark: 100 },
                { subject: "Completed", A: analytics?.performance?.completedPercentage ?? 85, fullMark: 100 },
                { subject: "Vitals Ratio", A: 96, fullMark: 100 }
              ]}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={600} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#e2e8f0" tick={false} />
                <Radar name="Dr. Score" dataKey="A" stroke="#16a34a" fill="#16a34a" fillOpacity={0.15} isAnimationActive={true} animationDuration={1000} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-1 text-center mt-2 pt-2 border-t border-slate-50 font-sans">
            <div className="bg-slate-50 rounded p-1">
              <span className="text-[8px] font-extrabold text-slate-400 uppercase">Consults Today</span>
              <p className="text-sm font-extrabold text-slate-800">{analytics?.performance?.seenToday ?? 0}</p>
            </div>
            <div className="bg-slate-50 rounded p-1">
              <span className="text-[8px] font-extrabold text-slate-400 uppercase">Rating</span>
              <p className="text-sm font-extrabold text-emerald-600">{analytics?.performance?.avgRating ?? "4.9"} ★</p>
            </div>
            <div className="bg-slate-50 rounded p-1">
              <span className="text-[8px] font-extrabold text-slate-400 uppercase">Satisfaction</span>
              <p className="text-sm font-extrabold text-emerald-600">{analytics?.performance?.patientSatisfaction ?? 96}%</p>
            </div>
          </div>
        </Card>

        {/* Appointment booking channel split */}
        <Card className="min-w-0 flex flex-col justify-between hover:border-slate-200 transition-all duration-300">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5 font-sans">
              <CalendarClock className="h-4 w-4 text-emerald-700" /> Source Analysis
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">Bookings source split</p>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={analytics?.appointmentAnalytics?.types ?? []}
                margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="#94a3b8" fontSize={9} fontFamily="Inter, sans-serif" fontWeight={500} tickLine={false} axisLine={false} dx={-8} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000}>
                  {(analytics?.appointmentAnalytics?.types ?? []).map((entry: any, index: number) => (
                    <Cell key={`cell-appt-source-${index}`} fill={CHART_COLORS.emerald[index % CHART_COLORS.emerald.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-50 pt-2 flex justify-between items-center font-sans">
            <span>Aggregated source</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-extrabold font-sans">Active</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
