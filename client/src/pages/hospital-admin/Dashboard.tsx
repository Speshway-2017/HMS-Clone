import { Link } from "react-router-dom";
import { CalendarClock, BedDouble, Wallet, Stethoscope, Users2, AlertTriangle, Plus } from "lucide-react";
import { useHospitalAnalytics } from "../../features/analytics";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";

export function HospitalAdminDashboard() {
  const { data } = useHospitalAnalytics();
  const counts = data?.counts;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hospital Dashboard</h1>
        <p className="text-sm text-slate-500">Daily operations overview for your hospital.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Today's Appointments" value={counts?.todaysAppointments ?? 0} icon={<CalendarClock className="h-5 w-5" />} emphasis />
        <KpiCard label="Bed Occupancy" value={`${counts?.bedOccupancyPercent ?? 0}%`} icon={<BedDouble className="h-5 w-5" />} trend={{ direction: "up", text: `${counts?.occupiedBeds ?? 0}/${counts?.totalBeds ?? 0} beds` }} />
        <KpiCard label="Total Revenue (Paid)" value={`$${(counts?.totalRevenue ?? 0).toFixed(2)}`} icon={<Wallet className="h-5 w-5" />} />
        <KpiCard label="Critical Stock Alerts" value={counts?.criticalStockCount ?? 0} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Doctors" value={counts?.totalDoctors ?? 0} icon={<Stethoscope className="h-5 w-5" />} />
        <KpiCard label="Staff" value={counts?.totalStaff ?? 0} icon={<Users2 className="h-5 w-5" />} />
        <KpiCard label="Patients" value={counts?.totalPatients ?? 0} icon={<Users2 className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="text-sm text-slate-500">
            Everything above is live from the database. Revenue reflects paid invoices; bed occupancy reflects
            department-level configured capacity.
          </p>
        </Card>

        <Card>
          <h3 className="mb-3 text-base font-semibold text-slate-800">Quick Actions</h3>
          <div className="space-y-2">
            <Link to="/admin/appointments/new" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              <Plus className="h-4 w-4 text-navy-700" /> Schedule Appointment
            </Link>
            <Link to="/admin/patients/new" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              <Plus className="h-4 w-4 text-navy-700" /> Register Patient
            </Link>
            <Link to="/admin/doctors/new" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              <Plus className="h-4 w-4 text-navy-700" /> Add Doctor
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
