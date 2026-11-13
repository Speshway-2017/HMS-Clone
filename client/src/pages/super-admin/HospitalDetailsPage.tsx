import { Link, useParams } from "react-router-dom";
import { Network, Users, Activity, BedDouble, MapPin, Mail, Phone, Pencil } from "lucide-react";
import { useHospital } from "../../features/hospitals";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

export function HospitalDetailsPage() {
  const { id } = useParams();
  const { data, isLoading } = useHospital(id);

  if (isLoading || !data) {
    return <p className="text-slate-400">Loading...</p>;
  }

  const { hospital, stats, branches } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">Hospital Profile / Code: {hospital.code}</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{hospital.name}</h1>
            <Badge tone={hospital.status === "active" ? "success" : "neutral"}>
              {hospital.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <Link to={`/super-admin/hospitals/${id}/edit`}>
          <Button variant="secondary">
            <Pencil className="h-4 w-4" /> Edit Details
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Branches" value={stats.branchCount} icon={<Network className="h-5 w-5" />} />
        <KpiCard label="Total Staff" value="—" icon={<Users className="h-5 w-5" />} trend={{ direction: "up", text: "No staff data yet" }} />
        <KpiCard label="Active Patients" value="—" icon={<Activity className="h-5 w-5" />} trend={{ direction: "up", text: "No patient data yet" }} />
        <KpiCard label="Bed Capacity" value={hospital.bedCapacity} icon={<BedDouble className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h3 className="text-base font-semibold text-slate-800">Admission Trends</h3>
            <p className="text-sm text-slate-500">Last 30 days performance</p>
            <div className="mt-6 flex h-48 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
              No admission data yet — available once the Patient/Appointments module is live.
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Connected Branches</h3>
              <Link to={`/super-admin/branches?hospitalId=${id}`} className="text-sm font-medium text-emerald-700 hover:underline">
                Manage Branches
              </Link>
            </div>
            {branches.length === 0 ? (
              <p className="text-sm text-slate-400">No branches added yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(branches as { _id: string; name: string; city: string; state: string }[]).map((b) => (
                  <div key={b._id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                      <Network className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{b.name}</div>
                      <div className="text-xs text-slate-500">
                        {b.city}
                        {b.state ? `, ${b.state}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-700" />
              <h3 className="text-base font-semibold text-slate-800">Location</h3>
            </div>
            <p className="text-sm text-slate-600">{hospital.address || "No address on file."}</p>
          </Card>

          <Card>
            <h3 className="mb-3 text-base font-semibold text-slate-800">Contact Info</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" /> {hospital.contactPhone || "—"}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" /> {hospital.contactEmail || "—"}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
