import { Link, useParams } from "react-router-dom";
import { useDepartmentMetrics } from "../../features/departments";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

export function DepartmentMetricsPage() {
  const { id } = useParams();
  const { data, isLoading } = useDepartmentMetrics(id);

  if (isLoading || !data) {
    return <p className="text-slate-400">Loading...</p>;
  }

  const { department } = data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          <Link to="/super-admin/departments" className="hover:text-navy-700">
            Departments
          </Link>{" "}
          / {department.name} / Metrics
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{department.name} Unit Overview</h1>
          <Badge tone="success">Live</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h3 className="text-base font-semibold text-slate-800">Patient Volume</h3>
          <p className="text-sm text-slate-500">Last 30 days trend</p>
          <div className="mt-6 flex h-40 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
            No patient data yet
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-slate-800">Bed Occupancy</h3>
          <p className="text-sm text-slate-500">Current availability</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-2">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-slate-100 text-2xl font-bold text-slate-300">
              N/A
            </div>
            <p className="text-xs text-slate-400">{department.totalBeds} beds configured</p>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-slate-800">Staffing</h3>
          <p className="text-sm text-slate-500">Configured headcount</p>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Doctors</span>
              <span className="font-semibold text-slate-800">{department.doctors}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Nurses</span>
              <span className="font-semibold text-slate-800">{department.nurses}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Support Staff</span>
              <span className="font-semibold text-slate-800">{department.support}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-base font-semibold text-slate-800">Department Staff Performance</h3>
        <div className="mt-6 flex h-32 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
          No doctor performance data yet — available once the Doctor module is live.
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 text-base font-semibold text-slate-800">Services &amp; Specializations</h3>
        <div className="flex flex-wrap gap-2">
          {department.services.length === 0 && <span className="text-sm text-slate-400">No services configured.</span>}
          {department.services.map((s) => (
            <Badge key={s} tone="info">
              {s}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
