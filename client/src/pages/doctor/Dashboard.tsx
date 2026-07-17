import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Activity,
  BedDouble,
  CalendarClock,
  AlertTriangle,
  Scissors,
  Video,
  Plus,
  Clock,
  User,
  ChevronRight,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Bell,
  FileText,
} from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { mapAppointmentTypeForDisplay } from "../../features/appointments";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";
import { useDoctorDashboardMetrics, useDoctorTodayAppointments } from "../../features/doctorDashboard";

const STATUS_BADGE: Record<string, { tone: "success" | "warning" | "info" | "neutral" | "danger"; label: string }> = {
  pending_payment: { tone: "danger",   label: "Pending Payment" },
  completed:       { tone: "success",  label: "Completed"       },
  in_consultation: { tone: "warning",  label: "In Consultation" },
  checked_in:      { tone: "info",     label: "Checked In"      },
  scheduled:       { tone: "neutral",  label: "Scheduled"       },
  cancelled:       { tone: "danger",   label: "Cancelled"       },
  no_show:         { tone: "danger",   label: "No Show"         },
};

export function DoctorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  
  // Fetch metrics counts from real MongoDB
  const { data: metrics, isLoading: isMetricsLoading, isError: isMetricsError } = useDoctorDashboardMetrics();

  // Fetch today's schedule for list display
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

  const isLoading = isMetricsLoading || isApptsLoading;

  // Filter surgeries today
  const upcomingSurgeries = appointments
    ? appointments
        .filter((a) => a.type?.toLowerCase() === "surgery")
        .map((a) => {
          const p = a.patient as any;
          return {
            id: a._id,
            patient: p?.name || "Unknown Patient",
            procedure: a.notes || "Surgical Procedure",
            date: `Today, ${a.time}`,
            ot: "OT-1",
            team: "Medical Team",
          };
        })
    : [];

  // Filter unique recent patients
  const recentPatients = appointments
    ? Array.from(
        new Map(
          appointments
            .filter((appt) => typeof appt.patient === "object" && appt.patient)
            .map((appt) => {
              const p = appt.patient as any;
              return [
                p._id,
                {
                  id: p._id,
                  name: p.name,
                  age: p.age || 35,
                  diagnosis: appt.notes || "Consultation",
                  lastVisit: "Today",
                },
              ];
            })
        ).values()
      ).slice(0, 3)
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-700 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Good Morning, {user?.name ?? "Doctor"} 👋</h1>
          <p className="text-sm text-slate-500">{today} · Your clinical overview for today</p>
        </div>
        <div className="flex gap-2">
          <Link to="/doctor/telemedicine">
            <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
              <Video className="h-4 w-4" /> Start Video Consult
            </button>
          </Link>
          <Link to="/doctor/op-management">
            <button className="flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 transition-colors">
              <Plus className="h-4 w-4" /> New Consultation
            </button>
          </Link>
        </div>
      </div>

      {/* KPI Cards (Widgets 1, 2, 3, 8, 10) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label="Today's Appointments"
          value={metrics?.todayAppointments ?? 0}
          icon={<Activity className="h-5 w-5" />}
          emphasis
          to="/doctor/appointments/today"
        />
        <KpiCard
          label="Waiting Patients"
          value={metrics?.waitingPatients ?? 0}
          icon={<User className="h-5 w-5" />}
          to="/doctor/queue"
        />
        <KpiCard
          label="Current Inpatients"
          value={metrics?.currentInpatients ?? 0}
          icon={<BedDouble className="h-5 w-5" />}
          to="/doctor/inpatients"
        />
        <KpiCard
          label="Today's Surgeries"
          value={metrics?.todaySurgeries ?? 0}
          icon={<Scissors className="h-5 w-5" />}
          to="/doctor/surgeries"
        />
        <KpiCard
          label="Calendar Schedule"
          value={metrics?.calendar ?? 0}
          icon={<CalendarClock className="h-5 w-5" />}
          to="/doctor/calendar"
        />
      </div>

      {/* Consultation Summary Row (Widgets 4, 5, 6, 7) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Completed Consultations", value: metrics?.completedConsultations ?? 0, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, color: "text-emerald-600", to: "/doctor/consultations/completed" },
          { label: "Pending Prescriptions", value: metrics?.pendingPrescriptions ?? 0, icon: <Clock className="h-4 w-4 text-amber-500" />, color: "text-amber-600", to: "/doctor/prescriptions/pending" },
          { label: "Pending Lab Orders", value: metrics?.pendingLabOrders ?? 0, icon: <Stethoscope className="h-4 w-4 text-blue-500" />, color: "text-blue-600", to: "/doctor/laboratory/pending" },
          { label: "Follow-up Patients", value: metrics?.followupPatients ?? 0, icon: <ChevronRight className="h-4 w-4 text-purple-500" />, color: "text-purple-600", to: "/doctor/followups" },
        ].map((s) => (
          <Link key={s.label} to={s.to} className="block no-underline text-inherit focus:outline-none h-full">
            <Card className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 hover:border-slate-350 transition-all duration-300 h-full">
              <div className="rounded-full bg-slate-100 p-2">{s.icon}</div>
              <div>
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Grid — Schedule + Side Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Today's Schedule</h3>
            <Link to="/doctor/appointments/today" className="flex items-center gap-1 text-xs font-medium text-navy-700 hover:underline">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {!appointments || appointments.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <CalendarClock className="mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm font-semibold text-slate-600">No Appointments Scheduled</p>
              <p className="text-xs text-slate-400">There are no consultations scheduled for you today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.map((appt) => {
                const p = appt.patient as any;
                const patientName = p?.name || "Unknown Patient";
                const initials = patientName.split(" ").map((n: string) => n[0]).join("").slice(0, 2);
                const time = appt.time;
                const type = mapAppointmentTypeForDisplay(appt.type);
                const token = appt.referenceId || appt._id.slice(-6);

                return (
                  <div
                    key={appt._id}
                    className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors hover:bg-slate-50 ${
                      appt.status === "in_consultation" ? "border-amber-200 bg-amber-50" : "border-slate-100"
                    }`}
                  >
                    <div className="w-16 shrink-0">
                      <p className="text-xs font-bold text-navy-700">{time}</p>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{patientName}</p>
                      <p className="text-xs text-slate-400">{type} · {token}</p>
                    </div>
                    <Badge tone={STATUS_BADGE[appt.status]?.tone || "neutral"}>
                      {STATUS_BADGE[appt.status]?.label || appt.status}
                    </Badge>
                    {["scheduled", "checked_in", "in_consultation"].includes(appt.status) && (
                      <Link to={`/doctor/consultation/${appt._id}`}>
                        <button className="rounded-lg bg-navy-700 px-3 py-1 text-xs font-medium text-white hover:bg-navy-800">
                          Open
                        </button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <h3 className="mb-3 text-base font-semibold text-slate-800">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "New Prescription",     type: "prescription", icon: <Plus className="h-4 w-4 text-navy-700" /> },
                { label: "Patient History",      type: "history",      icon: <User className="h-4 w-4 text-navy-700" /> },
                { label: "Create Lab Order",     type: "lab",          icon: <Stethoscope className="h-4 w-4 text-navy-700" /> },
                { label: "Medical Certificate",  type: "documents",    icon: <FileText className="h-4 w-4 text-navy-700" /> },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.type as any)}
                  className="flex items-center gap-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  {action.icon} {action.label}
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          </Card>

          {/* Notifications Card (Widget 9) */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Clinical Alerts</h3>
              <Link to="/doctor/notifications" className="text-xs font-medium text-navy-700 hover:underline">
                View All ({metrics?.notifications ?? 0})
              </Link>
            </div>
            <Link to="/doctor/notifications" className="block text-slate-700 hover:bg-slate-50 transition-colors border border-slate-100 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                  <Bell className="h-4 w-4 animate-bounce" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">You have {metrics?.notifications ?? 0} alerts</p>
                  <p className="text-xs text-slate-500 mt-0.5">Click to view critical lab reports or requests.</p>
                </div>
              </div>
            </Link>
          </Card>

          {/* Upcoming Surgeries */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Upcoming Surgeries</h3>
              <Link to="/doctor/surgeries" className="text-xs font-medium text-navy-700 hover:underline">View Surgeries</Link>
            </div>
            {upcomingSurgeries.length === 0 ? (
              <p className="py-2 text-center text-xs text-slate-400">No surgeries scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {upcomingSurgeries.map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Scissors className="h-3.5 w-3.5 text-red-500" />
                      <p className="text-xs font-bold text-slate-700">{s.date}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{s.patient}</p>
                    <p className="text-xs text-slate-500">{s.procedure}</p>
                    <p className="mt-1 text-xs text-slate-400">{s.ot} · {s.team}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Patients */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Recent Patients</h3>
              <Link to="/doctor/patients" className="text-xs font-medium text-navy-700 hover:underline">All Records</Link>
            </div>
            {recentPatients.length === 0 ? (
              <p className="py-2 text-center text-xs text-slate-400">No patients recorded today.</p>
            ) : (
              <div className="space-y-3">
                {recentPatients.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                      {p.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.age} yrs · {p.diagnosis}</p>
                    </div>
                    <span className="text-xs text-slate-400">{p.lastVisit}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
