import { Link, useParams } from "react-router-dom";
import { useDepartmentMetrics } from "../../features/departments";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ROLE_HOME_PATH } from "../../types/auth";

export function DepartmentMetricsPage() {
  const { id } = useParams();
  const { data, isLoading } = useDepartmentMetrics(id);
  const { user } = useAuth();
  const basePath = ROLE_HOME_PATH[user!.role];

  if (isLoading || !data) {
    return <p className="text-slate-400">Loading...</p>;
  }

  const { department, bedOccupancy } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">
            <Link to={`${basePath}/departments`} className="hover:text-emerald-700">
              Departments
            </Link>{" "}
            / {department.name} / Metrics
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{department.name} Unit Overview</h1>
            <Badge tone="success">Live</Badge>
          </div>
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
          <h3 className="text-base font-semibold text-slate-800">
            {bedOccupancy.total > 0 ? "Bed Occupancy" : "Unit Care Classification"}
          </h3>
          <p className="text-sm text-slate-500">
            {bedOccupancy.total > 0 ? "Current availability" : "Operational model"}
          </p>
          {bedOccupancy.total > 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center gap-2">
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-emerald-600 text-2xl font-bold text-emerald-700">
                {bedOccupancy.percent}%
              </div>
              <p className="text-xs text-slate-400">
                {bedOccupancy.occupied} / {bedOccupancy.total} beds occupied
              </p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center gap-2">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 border-2 border-emerald-200 text-xs font-bold uppercase text-center px-2">
                {department.status || "Active"}
              </div>
              <p className="text-xs text-slate-500 text-center mt-2">
                {department.isEmergency ? "24/7 Emergency & Acute Care" : "Standard Inpatient / Outpatient Unit"}
              </p>
            </div>
          )}
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
