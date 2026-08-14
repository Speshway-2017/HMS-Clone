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
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart } from "recharts";
import { usePatients } from "../../features/patients";
import { useInvoices } from "../../features/invoices";
import { useLaboratoryRequests } from "../../features/laboratory";

export function LaboratoryDashboard() {
  const navigate = useNavigate();
  const { data: dbRequests, isLoading: isRequestsLoading } = useLaboratoryRequests();
  const { data: invoiceData, isLoading: isInvoicesLoading } = useInvoices({ billingType: "LAB", limit: 100 });
  const requestsList = dbRequests || [];

  const [stats, setStats] = useState({
    pendingRequests: 0,
    samplesCollectedToday: 0,
    testsInProgress: 0,
    completedReports: 0,
    criticalReports: 0
  });

  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);

  useEffect(() => {
    const savedInventory = localStorage.getItem("hms_laboratory_inventory") || "[]";
    const inventory = JSON.parse(savedInventory);

    // Set statistics
    const pending = requestsList.filter((r: any) => r.status === "pending").length;
    const samples = requestsList.filter((r: any) => r.status === "accepted").length;
    const inProgress = requestsList.filter((r: any) => r.status === "processing").length;
    const completed = requestsList.filter((r: any) => r.status === "completed").length;
    const critical = requestsList.filter((r: any) => r.status === "report_uploaded" || r.status === "verified").length;

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

    if (inventory.length === 0) {
      const initialItems = [
        { _id: "LAB-INV-001", name: "CBC Diluent (Cellpack)", sku: "RE-CBC-01", category: "Reagent", quantity: 12, unit: "containers", expiryDate: "2027-02-15", reorderLevel: 5, batchNo: "B-CB991", storageTemp: "15 - 30°C" },
        { _id: "LAB-INV-002", name: "HbA1c Reagent Kit", sku: "RE-HBA-02", category: "Reagent", quantity: 3, unit: "kits", expiryDate: "2026-09-10", reorderLevel: 5, batchNo: "B-HB202", storageTemp: "2 - 8°C" },
        { _id: "LAB-INV-003", name: "Lipid Panel Cassettes", sku: "RE-LPD-03", category: "Reagent", quantity: 80, unit: "pieces", expiryDate: "2026-11-20", reorderLevel: 100, batchNo: "B-LP405", storageTemp: "2 - 8°C" },
        { _id: "LAB-INV-004", name: "Blood Collection Tubes (Purple Top)", sku: "CS-TUBE-01", category: "Consumable", quantity: 450, unit: "pieces", expiryDate: "2028-06-30", reorderLevel: 200, batchNo: "B-PT001", storageTemp: "15 - 30°C" },
        { _id: "LAB-INV-005", name: "Sterile Syringes 5ml", sku: "CS-SYR-02", category: "Consumable", quantity: 180, unit: "pieces", expiryDate: "2028-08-15", reorderLevel: 200, batchNo: "B-SR002", storageTemp: "15 - 30°C" }
      ];
      localStorage.setItem("hms_laboratory_inventory", JSON.stringify(initialItems));
      setInventoryList(initialItems);
    } else {
      setInventoryList(inventory);
    }
  }, [dbRequests]);

  // 1. Weekly priority trends (last 7 days)
  const last7DaysList = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  }).reverse();
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const liveWeeklyTrend = last7DaysList.map(dateStr => {
    const dObj = new Date(dateStr);
    const dayName = daysOfWeek[dObj.getDay()];
    const dayRequests = requestsList.filter((r: any) => {
      const rDate = new Date(r.createdAt || r.date).toISOString().split("T")[0];
      return rDate === dateStr;
    });
    return {
      name: dayName,
      Routine: dayRequests.filter((r: any) => r.priority === "Routine").length,
      Urgent: dayRequests.filter((r: any) => r.priority === "Urgent").length,
      STAT: dayRequests.filter((r: any) => r.priority === "STAT").length
    };
  });

  // 2. Volume by investigation test name (top 5 requested tests)
  const testCounts: Record<string, number> = {};
  requestsList.forEach((r: any) => {
    (r.tests || []).forEach((t: string) => {
      testCounts[t] = (testCounts[t] || 0) + 1;
    });
  });
  const liveDeptData = Object.entries(testCounts)
    .map(([name, volume]) => ({ name, volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  // 3. Billing Status (Paid vs Outstanding/Pending LAB Invoices)
  const rawInvoices = invoiceData?.data || [];
  let paidAmt = 0;
  let pendingAmt = 0;
  rawInvoices.forEach((inv: any) => {
    const amt = inv.totals?.total || inv.total || 0;
    if (inv.status === "paid") {
      paidAmt += amt;
    } else {
      pendingAmt += amt;
    }
  });
  const billingStatusData = [
    { name: "Paid Lab Fees", value: paidAmt, color: "#10b981" },
    { name: "Outstanding Unpaid", value: pendingAmt, color: "#f59e0b" }
  ].filter(d => d.value > 0);

  // 4. Test Requests Status split
  const reqStatusCounts: Record<string, number> = {};
  requestsList.forEach((r: any) => {
    const st = r.status || "pending";
    const label = st === "report_uploaded" ? "Report Uploaded" : st.charAt(0).toUpperCase() + st.slice(1);
    reqStatusCounts[label] = (reqStatusCounts[label] || 0) + 1;
  });
  const statusDistribution = Object.entries(reqStatusCounts).map(([name, value]) => ({
    name,
    value
  }));

  // 5. Revisits vs New requests
  const patientRequestCounts: Record<string, number> = {};
  requestsList.forEach((r: any) => {
    if (r.patientId) {
      patientRequestCounts[r.patientId] = (patientRequestCounts[r.patientId] || 0) + 1;
    }
  });
  let newRequests = 0;
  let revisitRequests = 0;
  requestsList.forEach((r: any) => {
    if (r.patientId && patientRequestCounts[r.patientId] > 1) {
      revisitRequests++;
    } else {
      newRequests++;
    }
  });
  const patientTypeData = [
    { name: "First-Time Request", value: newRequests, color: "#3b82f6" },
    { name: "Follow-up / Revisit", value: revisitRequests, color: "#8b5cf6" }
  ].filter(d => d.value > 0);



  const COLORS = ["#1e3a8a", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

  if (isRequestsLoading || isInvoicesLoading) {
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
          <p className="text-sm text-slate-500">Monitor diagnostic test requests, sample collections, and quality control.</p>
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
          to="/laboratory/completed-reports"
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
              <h3 className="text-base font-semibold text-slate-800">Weekly Test Priority & Growth</h3>
              <p className="text-xs text-slate-500">Live monitoring of Routine (bar), Urgent (line), and emergency STAT (line) requests.</p>
            </div>
            <Link to="/laboratory/completed-reports" className="text-xs font-semibold text-navy-700 hover:text-navy-800 flex items-center gap-1">
              View Reports <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={liveWeeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #CBD5E1" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Routine" name="Routine tests" fill="#3b82f6" opacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Line type="monotone" dataKey="Urgent" name="Urgent priority" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="STAT" name="STAT / Emergency" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
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

      {/* Lab sections bar chart, inventory quantities and alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Investigation Volume Chart */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-800">Diagnostic Volume by Investigation</h3>
          <div className="h-[250px]">
            {liveDeptData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No investigation requests logged.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={liveDeptData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="volume" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Lab Inventory Stock Levels */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">Laboratory Inventory Stock</h3>
            <Link to="/laboratory/inventory" className="text-xs font-semibold text-navy-700 hover:text-navy-800">
              Manage
            </Link>
          </div>
          <div className="h-[250px]">
            {inventoryList.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No inventory items.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryList} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} width={90} />
                  <Tooltip formatter={(value: number, name: string, props: any) => [`${value} ${props.payload.unit || "units"}`, "Quantity"]} />
                  <Bar dataKey="quantity" name="Stock Qty" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16}>
                    {inventoryList.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.quantity <= entry.reorderLevel ? "#ef4444" : "#8b5cf6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
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

      {/* Live Lab Diagnostics & Billing Analytics Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Billing Status collections split */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-800">Laboratory Billing Analytics</h3>
          <div className="h-[250px]">
            {billingStatusData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No billing logs found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={billingStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {billingStatusData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`]} />
                  <Legend
                    formatter={(value) => <span className="text-[11px] text-slate-650 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Test Request Status Split */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-800">Test Requests Status split</h3>
          <div className="h-[250px]">
            {statusDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No requests logged.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={80}
                    paddingAngle={0}
                  >
                    {statusDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} Requests`]} />
                  <Legend
                    formatter={(value) => <span className="text-[11px] text-slate-650 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revisits vs New Requests */}
        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Revisits vs New Requests</h3>
          <div className="h-[250px]">
            {patientTypeData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No patient requests.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={patientTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {patientTypeData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} Requests`]} />
                  <Legend
                    formatter={(value) => <span className="text-[11px] text-slate-650 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
