import { Link } from "react-router-dom";
import { Plus, ArrowRight } from "lucide-react";
import { useDepartments } from "../../features/departments";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { getDepartmentTheme } from "../../config/departmentTheme";

const STATUS_LABEL: Record<string, { text: string; tone: "success" | "danger" | "warning" }> = {
  operational: { text: "Operational", tone: "success" },
  critical_load: { text: "Critical Load", tone: "danger" },
  peak_hours: { text: "Peak Hours", tone: "warning" },
  inactive: { text: "Inactive", tone: "warning" },
};

export function DepartmentsPage() {
  const { data: departments, isLoading } = useDepartments();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-navy-700 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Clinical Departments</h1>
          <p className="mt-1 text-sm text-navy-100">
            Manage medical infrastructure and monitor departments across all registered hospitals.
          </p>
        </div>
        <Link to="/super-admin/departments/new">
          <Button variant="secondary" className="bg-white">
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        </Link>
      </div>

      {isLoading && <p className="text-slate-400">Loading...</p>}
      {!isLoading && departments?.length === 0 && <p className="text-slate-400">No departments yet — add the first one.</p>}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {departments?.map((dept) => {
          const theme = getDepartmentTheme(dept.category);
          const status = STATUS_LABEL[dept.status] ?? STATUS_LABEL.operational;
          return (
            <div key={dept._id} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-start justify-between">
                <span className={`inline-flex rounded-lg p-2.5 ${theme.className}`}>
                  <theme.icon className="h-5 w-5" />
                </span>
                <Badge tone={status.tone}>{status.text}</Badge>
              </div>
              <h3 className="text-lg font-semibold text-navy-700">{dept.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{dept.description || "No description provided."}</p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-200 bg-white py-2 text-center">
                  <div className="text-xs text-slate-400">Doctors</div>
                  <div className="text-sm font-semibold text-slate-800">{dept.doctors}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white py-2 text-center">
                  <div className="text-xs text-slate-400">Beds</div>
                  <div className="text-sm font-semibold text-slate-800">{dept.totalBeds}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white py-2 text-center">
                  <div className="text-xs text-slate-400">Rating</div>
                  <div className="text-sm font-semibold text-slate-800">{dept.rating}%</div>
                </div>
              </div>

              <Link to={`/super-admin/departments/${dept._id}/metrics`}>
                <Button variant="secondary" className="mt-4 w-full justify-center border-navy-200 text-navy-700">
                  View Full Metrics <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
