import { Link } from "react-router-dom";
import { 
  ClipboardCheck, 
  Users, 
  Clock, 
  AlertCircle,
  Plus,
  ChevronRight,
  TrendingUp,
  Activity
} from "lucide-react";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";
import { usePatients } from "../../features/patients";
import { useAuth } from "../../context/AuthContext";

export function NurseDashboard() {
  const { user } = useAuth();
  const { data: patientsData } = usePatients({ page: 1, status: "admitted" });

  const activePatientsCount = patientsData?.counts?.admitted ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nurse Care Station</h1>
          <p className="text-sm text-slate-500">Welcome, {user?.name || "Staff Nurse"}. Manage ward tasks and track inpatient status.</p>
        </div>
        <div>
          <Link
            to="/nurse/assign-task"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Assign Nursing Task
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Active Inpatients"
          value={activePatientsCount}
          icon={Users}
          description="Patients currently in ward"
        />
        <KpiCard
          title="Pending Tasks"
          value={12}
          icon={Clock}
          description="Due during current shift"
        />
        <KpiCard
          title="Critical Alerts"
          value={2}
          icon={AlertCircle}
          description="Vitals out of standard range"
        />
        <KpiCard
          title="Tasks Completed"
          value="85%"
          icon={ClipboardCheck}
          description="Completion rate today"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Ward Patients */}
        <Card className="lg:col-span-2 p-6 rounded-[16px] shadow-sm bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Active Inpatients</h2>
              <p className="text-xs text-slate-500">Currently admitted in General Ward and ICU</p>
            </div>
            <Link to="/doctor/patient-records" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {patientsData?.data && patientsData.data.length > 0 ? (
              patientsData.data.slice(0, 5).map((patient) => (
                <div key={patient._id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{patient.name}</div>
                      <div className="text-xs text-slate-500">UHID: {patient.uhid || "N/A"} • {patient.gender}, {patient.age} yrs</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      Admitted
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-slate-500">
                No active admitted patients found.
              </div>
            )}
          </div>
        </Card>

        {/* Quick Insights Sidebar */}
        <div className="space-y-6">
          <Card className="p-6 rounded-[16px] shadow-sm bg-white">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Ward Occupancy
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>General Ward A</span>
                  <span>14/15 Beds</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: "93%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>General Ward B</span>
                  <span>8/10 Beds</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: "80%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>ICU</span>
                  <span>2/5 Beds</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: "40%" }}></div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-[16px] shadow-sm bg-white">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Shift Timeline
            </h2>
            <div className="relative border-l border-slate-100 pl-4 ml-2 space-y-4 text-xs">
              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                <span className="font-semibold text-slate-800">14:00 PM</span>
                <p className="text-slate-500">Handover and vitals review</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-300"></span>
                <span className="font-semibold text-slate-800">16:30 PM</span>
                <p className="text-slate-500">Medication Round (IP Patients)</p>
              </div>
              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-300"></span>
                <span className="font-semibold text-slate-800">19:00 PM</span>
                <p className="text-slate-500">Doctor round followups</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
