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
import { useReceptionStats } from "../../features/receptionist";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";
import { formatINR } from "../../lib/currency";

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
        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Front Desk Queue State</h3>
          <div className="flex flex-col justify-center space-y-4 rounded-lg bg-slate-50 p-6 text-center text-slate-500 border border-slate-100">
            <Activity className="mx-auto h-12 w-12 text-slate-400" />
            <div>
              <p className="font-semibold text-slate-700">Token Queue Status</p>
              <p className="text-xs text-slate-500 mt-1">There are currently {stats?.waitingQueue ?? 0} patients in the waiting line.</p>
            </div>
            <div className="flex justify-center gap-4">
              <Link to="/receptionist/queue" className="rounded-lg bg-navy-700 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800">
                Manage Token Queue
              </Link>
              <Link to="/receptionist/queue/display" target="_blank" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Launch TV Display Board
              </Link>
            </div>
          </div>
        </Card>

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
      </div>
    </div>
  );
}
