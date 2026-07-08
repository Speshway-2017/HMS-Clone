import { Building2, Users2, CalendarClock } from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";

export function SuperAdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Enterprise Dashboard</h1>
        <p className="text-sm text-slate-500">Real-time oversight of global hospital network operations.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Annual Total Revenue" value="$124,582,000" icon={<Building2 className="h-5 w-5" />} emphasis trend={{ direction: "up", text: "+14.2% from last fiscal year" }} />
        <KpiCard label="Total Patients" value="852,410" icon={<Users2 className="h-5 w-5" />} />
        <KpiCard label="Total Appointments" value="2,142,500" icon={<CalendarClock className="h-5 w-5" />} />
      </div>

      <Card>
        <p className="text-sm text-slate-500">
          This is the Super Admin dashboard shell. Hospital/branch/department management screens are built out in
          the next phase.
        </p>
      </Card>
    </div>
  );
}
