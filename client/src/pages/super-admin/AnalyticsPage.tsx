import { Building2, Network, FolderTree, Users2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGlobalAnalytics } from "../../features/analytics";
import { KpiCard } from "../../components/ui/KpiCard";
import { ChartCard } from "../../components/ui/ChartCard";

const ROLE_LABEL: Record<string, string> = { hospital_admin: "Hospital Admin", accountant: "Accountant" };

export function AnalyticsPage() {
  const { data, isLoading } = useGlobalAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Global Analytics</h1>
        <p className="text-sm text-slate-500">Real-time structural metrics across the hospital network.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Hospitals" value={data?.counts.totalHospitals ?? 0} icon={<Building2 className="h-5 w-5" />} trend={{ direction: "up", text: `${data?.counts.activeHospitals ?? 0} active` }} />
        <KpiCard label="Total Branches" value={data?.counts.totalBranches ?? 0} icon={<Network className="h-5 w-5" />} />
        <KpiCard label="Total Departments" value={data?.counts.totalDepartments ?? 0} icon={<FolderTree className="h-5 w-5" />} />
        <KpiCard label="Total Admins" value={data?.counts.totalAdmins ?? 0} icon={<Users2 className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400">Total Revenue — no billing data yet</div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400">Active Patients — no patient data yet</div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400">Avg. Wait Time — no appointment data yet</div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400">Bed Occupancy — no admissions data yet</div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Branches per Hospital" subtitle="Top facilities by branch count">
          <div className="h-72">
            {!isLoading && (data?.charts.branchesPerHospital.length ?? 0) === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No branches yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.charts.branchesPerHospital}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="hospital" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="branches" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Admins by Role" subtitle="Distribution of hospital_admin vs accountant">
          <div className="h-72">
            {!isLoading && (data?.charts.adminsByRole.length ?? 0) === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No admins yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.charts.adminsByRole.map((r) => ({ ...r, label: ROLE_LABEL[r.role] ?? r.role }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
