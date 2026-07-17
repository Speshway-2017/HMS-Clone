import { Link } from "react-router-dom";
import {
  Users,
  CalendarCheck,
  Building,
  CreditCard,
  History,
  TrendingUp,
  Activity,
  AlertTriangle,
  Stethoscope,
  LayoutGrid
} from "lucide-react";
import { useReceptionStats, useQueueDetails } from "../../features/receptionist";
import { useCheckInAppointment } from "../../features/appointments";
import { useNotifications } from "../../features/notifications";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";
import { formatINR } from "../../lib/currency";
import toast from "react-hot-toast";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function KpiSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-card">
      <div className="flex justify-between items-center">
        <div className="h-3.5 w-28 rounded bg-slate-250" />
        <div className="h-8 w-8 rounded-lg bg-slate-100" />
      </div>
      <div className="mt-4 h-8 w-16 rounded bg-slate-250" />
    </div>
  );
}

export function ReceptionistDashboard() {
  const { data: stats, isLoading } = useReceptionStats();
  const { data: queueDetails, isLoading: queueDetailsLoading, refetch: refetchQueueDetails } = useQueueDetails();
  const checkInMutation = useCheckInAppointment();
  const { data: notifData } = useNotifications();
  const notifications = notifData?.data?.notifications ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reception Desk Console</h1>
          <p className="text-sm text-slate-500">Real-time control center for patient admissions, billing, and queues.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reception Desk Console</h1>
        <p className="text-sm text-slate-500">Real-time control center for patient admissions, billing, and queues.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Today's Registrations"
          value={stats?.todayRegistrations ?? 0}
          icon={<Users className="h-5 w-5" />}
          to="/receptionist/patients?filter=today"
          emphasis
        />
        <KpiCard
          label="Active OP Queue"
          value={stats?.waitingQueue ?? 0}
          icon={<Activity className="h-5 w-5 text-indigo-600" />}
          trend={stats?.emergencyQueue && stats.emergencyQueue > 0 ? { direction: "up", text: `${stats.emergencyQueue} Emergency` } : undefined}
          to="/receptionist/op/queue"
        />
        <KpiCard
          label="Current IP Admissions"
          value={stats?.todayIP ?? 0}
          icon={<Building className="h-5 w-5 text-emerald-600" />}
          to="/receptionist/ip/admissions"
        />
        <KpiCard
          label="Today's Collections"
          value={formatINR(stats?.todayCollections ?? 0)}
          icon={<TrendingUp className="h-5 w-5 text-teal-600" />}
          to="/receptionist/billing/collections"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pending Payments"
          value={stats?.pendingPayments ?? 0}
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
          to="/receptionist/billing/pending"
        />
        <KpiCard
          label="Completed Payments"
          value={stats?.completedPayments ?? 0}
          icon={<CreditCard className="h-5 w-5 text-green-500" />}
          to="/receptionist/billing/completed"
        />
        <KpiCard
          label="Available Rooms"
          value={stats?.roomsAvailable ?? 0}
          icon={<LayoutGrid className="h-5 w-5 text-blue-500" />}
          to="/receptionist/ip/rooms"
        />
        <KpiCard
          label="Available Beds"
          value={stats?.bedsAvailable ?? 0}
          icon={<Building className="h-5 w-5 text-violet-500" />}
          to="/receptionist/ip/beds"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Appointments Widget */}
          <Card>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-1.5">
                <CalendarCheck className="h-4.5 w-4.5 text-indigo-650" />
                Upcoming Appointments & Live Check-In
              </h3>
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                {queueDetails?.upcomingAppointments?.length ?? 0} Alerts Today
              </span>
            </div>

            {queueDetailsLoading ? (
              <div className="py-8 text-center text-slate-400">Loading alerts...</div>
            ) : !queueDetails?.upcomingAppointments || queueDetails.upcomingAppointments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No upcoming appointments requiring immediate check-in.
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {queueDetails.upcomingAppointments.map((appt: any) => {
                  const borderColors = {
                    green: "border-emerald-250 bg-emerald-50/20",
                    orange: "border-amber-250 bg-amber-50/20",
                    red: "border-rose-250 bg-rose-50/20"
                  };
                  const badgeColors = {
                    green: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    orange: "bg-amber-100 text-amber-800 border-amber-200",
                    red: "bg-rose-100 text-rose-800 border-rose-200"
                  };
                  const color = appt.alertColor || "green";

                  return (
                    <div
                      key={appt._id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between border rounded-xl p-3.5 transition-all ${(borderColors as any)[color]}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{appt.patient?.name}</span>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${(badgeColors as any)[color]}`}>
                            {appt.alertLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Dr. {appt.doctor?.name} ({appt.doctor?.specialization || "General"}) · Slot: <span className="font-bold text-slate-700">{appt.time}</span>
                        </p>
                      </div>

                      <div className="mt-3 sm:mt-0 flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await checkInMutation.mutateAsync(appt._id);
                              toast.success("Patient checked in successfully!");
                              refetchQueueDetails();
                            } catch (err: any) {
                              toast.error(err.response?.data?.message || err.message || "Failed to check in");
                            }
                          }}
                          disabled={checkInMutation.isPending}
                          className="rounded-lg bg-indigo-650 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors"
                        >
                          Check-In
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Detailed Live Queue Analytics */}
          <Card>
            <h3 className="mb-4 text-base font-semibold text-slate-800 flex items-center gap-1.5">
              <Activity className="h-4.5 w-4.5 text-emerald-600" />
              Live Queue Desk Overview
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Waiting Patients</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{queueDetails?.waitingPatients?.length ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Walk-In Queue</p>
                <p className="mt-1 text-2xl font-bold text-indigo-650">{queueDetails?.currentWalkInQueue?.length ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Checked-In Today</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{queueDetails?.checkedInPatients?.length ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450">In Consultation</p>
                <p className="mt-1 text-2xl font-bold text-emerald-650">{queueDetails?.currentlyConsulting?.length ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Missed Appts</p>
                <p className="mt-1 text-2xl font-bold text-rose-600">{queueDetails?.missedAppointments?.length ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Completed Visits</p>
                <p className="mt-1 text-2xl font-bold text-green-700">{queueDetails?.completedVisits?.length ?? 0}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 text-base font-semibold text-slate-800">Quick Desk Actions</h3>
            <div className="space-y-2.5">
              <Link to="/receptionist/patients/new" className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
                <span className="flex items-center gap-2.5">
                  <Users className="h-4.5 w-4.5 text-navy-700" /> Register New Patient
                </span>
              </Link>
              <Link to="/receptionist/appointments/new" className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
                <span className="flex items-center gap-2.5">
                  <CalendarCheck className="h-4.5 w-4.5 text-navy-700" /> Book OP Appointment
                </span>
              </Link>
              <Link to="/receptionist/billing/consultation" className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
                <span className="flex items-center gap-2.5">
                  <CreditCard className="h-4.5 w-4.5 text-navy-700" /> consultation Billing
                </span>
              </Link>
              <Link to="/receptionist/doctors/availability" className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
                <span className="flex items-center gap-2.5">
                  <Stethoscope className="h-4.5 w-4.5 text-navy-700" /> Check Doctor Schedules
                </span>
              </Link>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="h-4.5 w-4.5 text-navy-700" /> Notifications & Requests
              </h3>
              {notifications.length > 0 && (
                <span className="rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-bold text-navy-700">
                  {notifications.length}
                </span>
              )}
            </div>
            <div className="space-y-3 max-h-[16rem] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                  <p className="text-xs">No pending requests or alerts.</p>
                </div>
              ) : (
                notifications.slice(0, 5).map((n: any) => (
                  <Link
                    key={n.id}
                    to={n.link}
                    className={`block rounded-lg p-3 text-left transition-all border ${
                      n.severity === "critical"
                        ? "bg-red-50/60 border-red-100 hover:bg-red-50 text-red-950"
                        : n.severity === "warning"
                        ? "bg-amber-50/60 border-amber-100 hover:bg-amber-50 text-amber-950"
                        : "bg-slate-50 border-slate-150 hover:bg-slate-100/80 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        n.severity === "critical" ? "text-red-700" : n.severity === "warning" ? "text-amber-700" : "text-slate-500"
                      }`}>
                        {n.title}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium shrink-0">{relativeTime(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed font-medium line-clamp-2">
                      {n.message}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
