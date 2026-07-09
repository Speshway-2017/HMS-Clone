import { Link, useParams } from "react-router-dom";
import { Pencil, Star } from "lucide-react";
import { useDepartmentMetrics } from "../../features/departments";
import { useDoctors } from "../../features/doctors";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ROLE_HOME_PATH } from "../../types/auth";

export function DepartmentMetricsPage() {
  const { id } = useParams();
  const { data, isLoading } = useDepartmentMetrics(id);
  const { user } = useAuth();
  const basePath = ROLE_HOME_PATH[user!.role];
  const isHospitalAdmin = user?.role === "hospital_admin";
  const { data: doctorsInDept } = useDoctors({ department: id }, { enabled: isHospitalAdmin });

  if (isLoading || !data) {
    return <p className="text-slate-400">Loading...</p>;
  }

  const { department, bedOccupancy } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">
            <Link to={`${basePath}/departments`} className="hover:text-navy-700">
              Departments
            </Link>{" "}
            / {department.name} / Metrics
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{department.name} Unit Overview</h1>
            <Badge tone="success">Live</Badge>
          </div>
        </div>
        <Link to={`${basePath}/departments/${id}/edit`}>
          <Button variant="secondary">
            <Pencil className="h-4 w-4" /> Edit Dept
          </Button>
        </Link>
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
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-navy-600 text-2xl font-bold text-navy-700">
              {bedOccupancy.percent}%
            </div>
            <p className="text-xs text-slate-400">
              {bedOccupancy.occupied} / {bedOccupancy.total} beds occupied
            </p>
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
        <h3 className="mb-4 text-base font-semibold text-slate-800">Department Staff Performance</h3>
        {!isHospitalAdmin ? (
          <div className="flex h-32 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
            Doctor performance is managed from the Hospital Admin console.
          </div>
        ) : doctorsInDept && doctorsInDept.data.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {doctorsInDept.data.map((doc) => (
              <Link key={doc._id} to={`/admin/doctors/${doc._id}`} className="flex items-center justify-between py-2 hover:bg-slate-50">
                <div>
                  <div className="text-sm font-medium text-slate-800">{doc.name}</div>
                  <div className="text-xs text-slate-400">{doc.specialization || "General"}</div>
                </div>
                <span className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-amber-500" /> {doc.rating}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
            No doctors assigned to this department yet.
          </div>
        )}
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
