import { Link, useParams } from "react-router-dom";
import { BarChart3, Star, MapPin, Users2 } from "lucide-react";
import { useDoctor } from "../../features/doctors";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

export function DoctorProfilePage() {
  const { id } = useParams();
  const { data, isLoading } = useDoctor(id);

  if (isLoading || !data) {
    return <p className="text-slate-400">Loading...</p>;
  }

  const { doctor, stats } = data;
  const departmentName = typeof doctor.department === "object" && doctor.department ? doctor.department.name : "Unassigned";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {doctor.photoUrl ? (
            <img src={doctor.photoUrl} alt={doctor.name} className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-navy-100 text-xl font-semibold text-navy-700">
              {doctor.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{doctor.name}</h1>
            <p className="text-sm text-slate-500">
              {doctor.specialization || "General Practice"} • {departmentName}
            </p>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-amber-500">
                <Star className="h-4 w-4 fill-amber-500" /> {doctor.rating}
              </span>
              <Badge tone={doctor.status === "on_duty" ? "success" : "neutral"}>{doctor.status.replace("_", " ")}</Badge>
            </div>
          </div>
        </div>
        <Link to={`/admin/doctors/${id}/performance`}>
          <Button variant="secondary">
            <BarChart3 className="h-4 w-4" /> Performance
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-2 text-base font-semibold text-slate-800">Professional Biography</h3>
          <p className="text-sm text-slate-600">{doctor.bio || "No biography on file."}</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">Qualification</h4>
              <p className="text-sm text-slate-600">{doctor.qualification || "Not specified"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-700">License</h4>
              <p className="text-sm text-slate-600">{doctor.licenseNo || "Not specified"}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-navy-50">
          <div className="flex items-center gap-2 text-navy-700">
            <Users2 className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Patients Treated</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-navy-800">{stats.patientsTreated}</div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <MapPin className="h-4 w-4" /> {doctor.email || "No email on file"}
          </div>
          <div className="mt-1 text-sm text-slate-500">{doctor.phone || "No phone on file"}</div>
        </Card>
      </div>
    </div>
  );
}
