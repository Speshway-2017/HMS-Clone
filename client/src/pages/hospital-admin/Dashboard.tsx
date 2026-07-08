import { CalendarClock, BedDouble, Wallet } from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";

export function HospitalAdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hospital Dashboard</h1>
        <p className="text-sm text-slate-500">Daily operations overview for your hospital.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Today's Appointments" value="142" icon={<CalendarClock className="h-5 w-5" />} trend={{ direction: "up", text: "+12% from yesterday" }} />
        <KpiCard label="Available Beds" value="84%" icon={<BedDouble className="h-5 w-5" />} />
        <KpiCard label="Total Revenue" value="$1.2M" icon={<Wallet className="h-5 w-5" />} trend={{ direction: "up", text: "Monthly target 80%" }} />
      </div>

      <Card>
        <p className="text-sm text-slate-500">
          This is the Hospital Admin dashboard shell. Doctor/patient/appointment/inventory management screens are
          built out in the next phase.
        </p>
      </Card>
    </div>
  );
}
