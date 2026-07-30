import { useState } from "react";
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
  LayoutGrid,
  Clock,
  UserCheck,
  CheckCircle,
  ExternalLink,
  BarChart3
} from "lucide-react";
import { useReceptionStats, useQueueDetails, useAdmissions } from "../../features/receptionist";
import { useCheckInAppointment, useAppointments } from "../../features/appointments";
import { useNotifications } from "../../features/notifications";
import { usePatients } from "../../features/patients";
import { useInvoices } from "../../features/invoices";
import { useDoctors } from "../../features/doctors";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { formatINR } from "../../lib/currency";
import toast from "react-hot-toast";

import { ReceptionistAnalytics } from "../../components/receptionist/ReceptionistAnalytics";

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

  const { data: patientsData, isLoading: loadingPatients } = usePatients({ limit: 1000 });
  const { data: appointmentsResponse } = useAppointments({ limit: 1000 });
  const { data: invoicesData } = useInvoices({ limit: 1000 });
  const { data: doctorsResponse } = useDoctors({ limit: 1000 });
  const { data: admissionsData } = useAdmissions("all");

  const patientsList = patientsData?.data || [];
  const appointmentsList = appointmentsResponse?.data || [];
  const invoicesList = invoicesData?.data || [];
  const doctorsListArray = Array.isArray(doctorsResponse) ? doctorsResponse : (doctorsResponse as any)?.data || [];
  const admissionsList = admissionsData || [];

  const [selectedKpiModal, setSelectedKpiModal] = useState<{
    title: string;
    filterKey: string;
    icon: any;
    items: any[];
  } | null>(null);

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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-1.5">
                    <Activity className="h-4.5 w-4.5 text-emerald-600" />
                    Live Queue Desk Overview
                  </h3>
                  <span className="text-[11px] font-medium text-slate-450">
                    Click any card to inspect patient details
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedKpiModal({
                        title: "Waiting Patients",
                        filterKey: "waiting",
                        icon: <Clock className="h-5 w-5 text-amber-600" />,
                        items: queueDetails?.waitingPatients ?? []
                      })
                    }
                    className="group flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-center transition-all hover:-translate-y-0.5 hover:bg-amber-50/30 hover:border-amber-300 hover:shadow-md cursor-pointer"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-700 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>Waiting Patients</span>
                    </p>
                    <p className="mt-1 text-2xl font-bold text-amber-600">{queueDetails?.waitingPatients?.length ?? 0}</p>
                    <span className="mt-1 text-[9px] font-semibold text-slate-450 group-hover:text-amber-700 flex items-center gap-0.5">
                      Inspect queue <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedKpiModal({
                        title: "Walk-In Queue",
                        filterKey: "walkin",
                        icon: <Users className="h-5 w-5 text-indigo-650" />,
                        items: queueDetails?.currentWalkInQueue ?? []
                      })
                    }
                    className="group flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-center transition-all hover:-translate-y-0.5 hover:bg-indigo-50/30 hover:border-indigo-300 hover:shadow-md cursor-pointer"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-700 flex items-center gap-1">
                      <Users className="h-3 w-3 text-indigo-650 shrink-0" />
                      <span>Walk-In Queue</span>
                    </p>
                    <p className="mt-1 text-2xl font-bold text-indigo-650">{queueDetails?.currentWalkInQueue?.length ?? 0}</p>
                    <span className="mt-1 text-[9px] font-semibold text-slate-450 group-hover:text-indigo-650 flex items-center gap-0.5">
                      Inspect walk-ins <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedKpiModal({
                        title: "Checked-In Today",
                        filterKey: "checkedin",
                        icon: <UserCheck className="h-5 w-5 text-slate-800" />,
                        items: queueDetails?.checkedInPatients ?? []
                      })
                    }
                    className="group flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-center transition-all hover:-translate-y-0.5 hover:bg-slate-100/60 hover:border-slate-300 hover:shadow-md cursor-pointer"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-900 flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-slate-700 shrink-0" />
                      <span>Checked-In Today</span>
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-800">{queueDetails?.checkedInPatients?.length ?? 0}</p>
                    <span className="mt-1 text-[9px] font-semibold text-slate-450 group-hover:text-slate-800 flex items-center gap-0.5">
                      Inspect checked-in <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedKpiModal({
                        title: "In Consultation",
                        filterKey: "consulting",
                        icon: <Stethoscope className="h-5 w-5 text-emerald-655" />,
                        items: queueDetails?.currentlyConsulting ?? []
                      })
                    }
                    className="group flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-center transition-all hover:-translate-y-0.5 hover:bg-emerald-50/30 hover:border-emerald-300 hover:shadow-md cursor-pointer"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 flex items-center gap-1">
                      <Stethoscope className="h-3 w-3 text-emerald-655 shrink-0" />
                      <span>In Consultation</span>
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-655">{queueDetails?.currentlyConsulting?.length ?? 0}</p>
                    <span className="mt-1 text-[9px] font-semibold text-slate-450 group-hover:text-emerald-655 flex items-center gap-0.5">
                      Inspect active visits <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedKpiModal({
                        title: "Missed Appointments",
                        filterKey: "missed",
                        icon: <AlertTriangle className="h-5 w-5 text-rose-600" />,
                        items: queueDetails?.missedAppointments ?? []
                      })
                    }
                    className="group flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-center transition-all hover:-translate-y-0.5 hover:bg-rose-50/30 hover:border-rose-300 hover:shadow-md cursor-pointer"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-rose-700 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                      <span>Missed Appts</span>
                    </p>
                    <p className="mt-1 text-2xl font-bold text-rose-600">{queueDetails?.missedAppointments?.length ?? 0}</p>
                    <span className="mt-1 text-[9px] font-semibold text-slate-450 group-hover:text-rose-600 flex items-center gap-0.5">
                      Inspect missed <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedKpiModal({
                        title: "Completed Visits",
                        filterKey: "completed",
                        icon: <CheckCircle className="h-5 w-5 text-green-700" />,
                        items: queueDetails?.completedVisits ?? []
                      })
                    }
                    className="group flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-center transition-all hover:-translate-y-0.5 hover:bg-green-50/30 hover:border-green-300 hover:shadow-md cursor-pointer"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-green-800 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-700 shrink-0" />
                      <span>Completed Visits</span>
                    </p>
                    <p className="mt-1 text-2xl font-bold text-green-700">{queueDetails?.completedVisits?.length ?? 0}</p>
                    <span className="mt-1 text-[9px] font-semibold text-slate-450 group-hover:text-green-700 flex items-center gap-0.5">
                      Inspect completed <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  </button>
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

          {/* Visual Operations Analytics Section */}
          <div className="border-t border-slate-200 pt-6 mt-8">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-650" /> Live Operations Analytics
              </h2>
              <p className="text-xs text-slate-500 font-medium">Live graphical metrics for registrations, collections, busy hours, and workloads.</p>
            </div>
            <ReceptionistAnalytics
              patients={patientsList}
              appointments={appointmentsList}
              invoices={invoicesList}
              invoicesCounts={invoicesData?.counts}
              doctors={doctorsListArray}
              admissions={admissionsList}
              isLoading={loadingPatients}
            />
          </div>

      {/* KPI Detail Breakdown Modal */}
      {selectedKpiModal && (
        <Modal
          isOpen={!!selectedKpiModal}
          onClose={() => setSelectedKpiModal(null)}
          title={selectedKpiModal.title}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div className="flex items-center gap-2">
                {selectedKpiModal.icon}
                <span className="text-xs font-semibold text-slate-600">
                  {selectedKpiModal.items.length} records today
                </span>
              </div>
              <Link
                to={`/receptionist/op/queue?filter=${selectedKpiModal.filterKey}`}
                onClick={() => setSelectedKpiModal(null)}
                className="text-xs font-bold text-indigo-650 hover:text-indigo-800 hover:underline flex items-center gap-1"
              >
                Open Full OP Desk Queue →
              </Link>
            </div>

            {selectedKpiModal.items.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No patient records currently found in this category for today.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {selectedKpiModal.items.map((item: any, idx: number) => {
                  const patientName = item.patient?.name || item.patientName || "Patient";
                  const uhid = item.patient?.uhid || "N/A";
                  const doctorName = item.doctor?.name || "Unassigned";
                  const token = item.tokenNumber || item.referenceId || `#${idx + 1}`;
                  const timeDisplay = item.time || (item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Today");

                  return (
                    <div
                      key={item._id || idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3 hover:bg-slate-100/60 transition-colors gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-white border border-slate-250 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-800">
                            {token}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">{patientName}</span>
                          <span className="text-[10px] font-mono text-slate-400">({uhid})</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Dr. {doctorName} · Slot/Time: <span className="font-semibold text-slate-700">{timeDisplay}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await checkInMutation.mutateAsync(item._id);
                                toast.success("Patient checked in successfully!");
                                refetchQueueDetails();
                                setSelectedKpiModal(null);
                              } catch (err: any) {
                                toast.error(err.message || "Failed to check in");
                              }
                            }}
                            disabled={checkInMutation.isPending}
                            className="rounded-lg bg-indigo-650 hover:bg-indigo-700 px-3 py-1 text-xs font-semibold text-white transition-colors"
                          >
                            Check-In
                          </button>
                        )}
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "waiting"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : item.status === "called"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : item.status === "completed"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : item.status === "no_show" || item.status === "missed"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {item.status || "active"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
