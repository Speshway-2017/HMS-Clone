import { Link } from "react-router-dom";
import { Building2, Network, FolderTree, Users2, Plus, BarChart3, FileText } from "lucide-react";
import { useGlobalAnalytics } from "../../features/analytics";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";

export function SuperAdminDashboard() {
  const { data } = useGlobalAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Enterprise Dashboard</h1>
        <p className="text-sm text-slate-500">Real-time oversight of global hospital network operations.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Hospitals" value={data?.counts.totalHospitals ?? 0} icon={<Building2 className="h-5 w-5" />} emphasis trend={{ direction: "up", text: `${data?.counts.activeHospitals ?? 0} active` }} />
        <KpiCard label="Total Branches" value={data?.counts.totalBranches ?? 0} icon={<Network className="h-5 w-5" />} />
        <KpiCard label="Total Departments" value={data?.counts.totalDepartments ?? 0} icon={<FolderTree className="h-5 w-5" />} />
        <KpiCard label="Total Admins" value={data?.counts.totalAdmins ?? 0} icon={<Users2 className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="text-sm text-slate-500">
            Revenue, patient, and appointment KPIs will populate here once the Billing and Patient/Appointment
            modules are built in later phases. Everything above is live from the database.
          </p>
        </Card>

        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800">Quick Actions</h3>
          <div className="space-y-2">
            <Link to="/super-admin/hospitals/new" className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-navy-700" /> Add New Hospital
              </span>
            </Link>
            <Link to="/super-admin/analytics" className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-navy-700" /> Global Network Report
              </span>
            </Link>
            <Link to="/super-admin/reports" className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-navy-700" /> Reports Hub
              </span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
