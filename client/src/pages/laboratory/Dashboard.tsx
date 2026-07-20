import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  FlaskConical, 
  Clock, 
  Activity, 
  ShieldCheck, 
  AlertOctagon, 
  Boxes, 
  FileText, 
  ClipboardList, 
  ArrowRight
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { usePatients } from "../../features/patients";

import { useLaboratoryRequests } from "../../features/laboratory";

export function LaboratoryDashboard() {
  const navigate = useNavigate();
  const { data: dbRequests = [], isLoading: isRequestsLoading } = useLaboratoryRequests();

  const [stats, setStats] = useState({
    pendingRequests: 0,
    samplesCollectedToday: 0,
    testsInProgress: 0,
    completedReports: 0,
    criticalReports: 0
  });

  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);

  useEffect(() => {
    const savedInventory = localStorage.getItem("hms_laboratory_inventory") || "[]";
    const inventory = JSON.parse(savedInventory);

    // Set statistics
    const pending = dbRequests.filter((r: any) => r.status === "pending").length;
    const samples = dbRequests.filter((r: any) => r.status === "accepted").length;
    const inProgress = dbRequests.filter((r: any) => r.status === "processing").length;
    const completed = dbRequests.filter((r: any) => r.status === "completed").length;
    const critical = dbRequests.filter((r: any) => r.status === "report_uploaded" || r.status === "verified").length;

    setStats({
      pendingRequests: pending,
      samplesCollectedToday: samples,
      testsInProgress: inProgress,
      completedReports: completed,
      criticalReports: critical
    });

    // Check inventory alerts
    const lowStock = inventory.filter((item: any) => item.quantity <= item.reorderLevel);
    setCriticalAlerts(lowStock.slice(0, 3));
  }, [dbRequests]);

  const weeklyTrendData = [
    { name: "Mon", CBC: 12, Lipid: 8, LFT: 6, HbA1c: 15 },
    { name: "Tue", CBC: 19, Lipid: 12, LFT: 10, HbA1c: 18 },
    { name: "Wed", CBC: 15, Lipid: 10, LFT: 8, HbA1c: 22 },
    { name: "Thu", CBC: 22, Lipid: 14, LFT: 12, HbA1c: 25 },
    { name: "Fri", CBC: 28, Lipid: 18, LFT: 15, HbA1c: 30 },
    { name: "Sat", CBC: 10, Lipid: 6, LFT: 5, HbA1c: 12 },
    { name: "Sun", CBC: 4, Lipid: 2, LFT: 2, HbA1c: 5 },
  ];

  const deptData = [
    { name: "Hematology", volume: 145 },
    { name: "Biochemistry", volume: 189 },
    { name: "Microbiology", volume: 45 },
    { name: "Immunology", volume: 68 },
    { name: "Pathology", volume: 22 }
  ];

  if (isRequestsLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-slate-500 font-medium">Loading laboratory dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laboratory Dashboard</h1>
          <p className="text-sm text-slate-500">Monitor diagnostic test requests, sample collections, QC and reports delivery.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Laboratory Service Active
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard 
          label="Pending Requests" 
          value={stats.pendingRequests} 
          icon={<ClipboardList className="h-4 w-4" />} 
          emphasis
          to="/laboratory/requests"
          size="sm"
        />
        <KpiCard 
          label="Samples Collected" 
          value={stats.samplesCollectedToday} 
          icon={<FlaskConical className="h-4 w-4" />} 
          to="/laboratory/samples"
          size="sm"
        />
        <KpiCard 
          label="Tests In Progress" 
          value={stats.testsInProgress} 
          icon={<Activity className="h-4 w-4" />} 
          to="/laboratory/processing"
          size="sm"
        />
        <KpiCard 
          label="Completed Reports" 
          value={stats.completedReports} 
          icon={<FileText className="h-4 w-4" />} 
          to="/laboratory/reports"
          size="sm"
        />
        <KpiCard 
          label="Critical Warnings" 
          value={stats.criticalReports} 
          icon={<AlertOctagon className="h-4 w-4 text-red-500" />} 
          trend={stats.criticalReports > 0 ? { direction: "up", text: "Action required" } : undefined}
          to="/laboratory/qc"
          size="sm"
        />
      </div>

      {/* Analytics charts and Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly test trend */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Weekly Test Volume</h3>
              <p className="text-xs text-slate-500">Number of diagnostic reports processed by type.</p>
            </div>
            <Link to="/laboratory/reports" className="text-xs font-semibold text-navy-700 hover:text-navy-800 flex items-center gap-1">
              View Reports <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCBC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                />
                <Area type="monotone" dataKey="CBC" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorCBC)" />
                <Area type="monotone" dataKey="HbA1c" stroke="#10B981" strokeWidth={2} fill="none" />
                <Area type="monotone" dataKey="Lipid" stroke="#F59E0B" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick Actions Panel */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-800">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <button 
              onClick={() => navigate("/laboratory/samples")}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Register Samples</div>
                <div className="text-xs text-slate-500">Onboard collected vials and print barcode</div>
              </div>
            </button>

            <button 
              onClick={() => navigate("/laboratory/processing")}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-700">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Process Tests</div>
                <div className="text-xs text-slate-500">Record assay parameter values & flags</div>
              </div>
            </button>

            <button 
              onClick={() => navigate("/laboratory/qc")}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Verify Reports</div>
                <div className="text-xs text-slate-500">Perform QA audit and release results</div>
              </div>
            </button>

            <button 
              onClick={() => navigate("/laboratory/inventory")}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Check Inventory</div>
                <div className="text-xs text-slate-500">Monitor lab reagents & kit stock levels</div>
              </div>
            </button>
          </div>
        </Card>
      </div>

      {/* Lab sections bar chart and alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Department Volume Chart */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-800">Diagnostic Volume by Department</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="volume" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Critical Alerts Log */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Critical Reagents Alerts</h3>
            <Link to="/laboratory/inventory" className="text-xs font-semibold text-navy-700 hover:text-navy-800">
              Manage Stock
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {criticalAlerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">All lab reagents are at optimal levels.</div>
            ) : (
              criticalAlerts.map(item => (
                <div key={item._id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-500">Batch: {item.batchNo} | Expiring: {item.expiryDate}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-600">{item.quantity} units</span>
                    <span className="block text-[10px] text-slate-400">Limit: {item.reorderLevel}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
