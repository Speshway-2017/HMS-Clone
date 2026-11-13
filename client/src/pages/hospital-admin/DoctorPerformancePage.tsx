import { Link, useParams } from "react-router-dom";
import { Smile, Users2, TrendingUp } from "lucide-react";
import { useDoctorPerformance } from "../../features/doctors";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";

export function DoctorPerformancePage() {
  const { id } = useParams();
  const { data, isLoading } = useDoctorPerformance(id);

  if (isLoading || !data) {
    return <p className="text-slate-400">Loading...</p>;
  }

  const { doctor, metrics } = data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-wide text-emerald-600">Performance Management</p>
        <h1 className="text-2xl font-bold text-slate-900">
          <Link to={`/admin/doctors/${id}`} className="hover:underline">
            {doctor.name}
          </Link>{" "}
          — Performance Analytics
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Patient Satisfaction" value={`${metrics.patientSatisfaction}%`} icon={<Smile className="h-5 w-5" />} emphasis />
        <KpiCard label="Monthly Volume" value={metrics.monthlyVolume} icon={<Users2 className="h-5 w-5" />} trend={{ direction: "up", text: "appointments this month" }} />
        <KpiCard label="Total Completed" value={metrics.completedTotal} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <Card>
        <p className="text-sm text-slate-500">
          Detailed consultation-time and department-comparison analytics will populate here once richer appointment
          telemetry is captured. The figures above reflect real appointment counts for this doctor.
        </p>
      </Card>
    </div>
  );
}
