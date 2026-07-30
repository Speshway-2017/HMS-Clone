import { useMemo } from "react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { ChartCard } from "../ui/ChartCard";
import { Users, Calendar, Wallet, CheckCircle, TrendingUp } from "lucide-react";

interface ReceptionistAnalyticsProps {
  patients: any[];
  appointments: any[];
  invoices: any[];
  invoicesCounts?: {
    cashCollection?: number;
    upiCollection?: number;
    cardCollection?: number;
  };
  doctors: any[];
  admissions: any[];
  isLoading: boolean;
}

const APPOINTMENT_STATUS_COLORS: { [key: string]: string } = {
  "Scheduled": "#4f46e5",
  "Checked In": "#3b82f6",
  "In Consultation": "#10b981",
  "Completed": "#059669",
  "Pending Payment": "#f59e0b",
  "Cancelled": "#ef4444",
  "No Show": "#64748b"
};

const CHART_COLORS = ["#4f46e5", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export function ReceptionistAnalytics({
  patients,
  appointments,
  invoices,
  invoicesCounts,
  doctors,
  admissions,
  isLoading
}: ReceptionistAnalyticsProps) {

  const data = useMemo(() => {
    // 1. Process 7-day registration and collections curve
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const dailyRegistrationData = last7Days.map(date => {
      const count = patients.filter(p => {
        const pDate = new Date(p.createdAt || p.registeredAt || Date.now()).toISOString().split("T")[0];
        return pDate === date;
      }).length;
      const formattedDate = new Date(date).toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
      return { date: formattedDate, registrations: count };
    });

    const dailyCollectionsData = last7Days.map(date => {
      const dayInvoices = invoices.filter(inv => {
        const iDate = new Date(inv.issuedAt || inv.createdAt || Date.now()).toISOString().split("T")[0];
        return iDate === date && (inv.status === "paid" || inv.status === "partially_paid");
      });
      const totalAmount = dayInvoices.reduce((sum, inv) => sum + (inv.totals?.total || 0), 0);
      const formattedDate = new Date(date).toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
      return { date: formattedDate, amount: totalAmount };
    });

    // 2. Classify check-in appointments by slot hour (Busy hours)
    let morning = 0;
    let afternoon = 0;
    let evening = 0;
    appointments.forEach(appt => {
      if (!appt.time) return;
      const [hStr] = appt.time.split(":");
      const hour = parseInt(hStr, 10);
      if (!isNaN(hour)) {
        if (hour >= 8 && hour < 12) morning++;
        else if (hour >= 12 && hour < 16) afternoon++;
        else if (hour >= 16 && hour < 20) evening++;
      }
    });
    const trafficData = [
      { name: "Morning (08-12)", patients: morning },
      { name: "Afternoon (12-16)", patients: afternoon },
      { name: "Evening (16-20)", patients: evening },
    ];

    // 3. Revisitor vs New split
    let newPatients = 0;
    let followUps = 0;
    appointments.forEach(appt => {
      if (appt.type === "Follow-up" || appt.followUp === true) {
        followUps++;
      } else {
        newPatients++;
      }
    });
    const revisitorData = [
      { name: "New Consults", value: newPatients },
      { name: "Revisits", value: followUps },
    ];

    // 4. Appointment status breakdown
    const statusMap: { [key: string]: number } = {};
    appointments.forEach(appt => {
      const status = appt.status || "scheduled";
      const name = status
        .split("_")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      statusMap[name] = (statusMap[name] || 0) + 1;
    });
    const appointmentStatusData = Object.keys(statusMap).map(name => ({
      name,
      value: statusMap[name],
      color: APPOINTMENT_STATUS_COLORS[name] || "#64748b"
    }));

    // 5. Admissions by Ward type
    const wardMap: { [key: string]: number } = {};
    admissions.forEach(a => {
      if (a.status === "admitted" || a.status === "Admitted" || a.status === "Bed Allocated" || a.status === "In Ward") {
        const name = typeof a.room === "object" && a.room ? a.room.name || a.room.category || a.room.type : "General Ward";
        if (name) {
          wardMap[name] = (wardMap[name] || 0) + 1;
        }
      }
    });
    const wardOccupancyData = Object.keys(wardMap).map(name => ({
      name,
      value: wardMap[name]
    })).sort((a, b) => b.value - a.value);

    // 6. Invoices billing status
    let paid = 0;
    let pending = 0;
    let partiallyPaid = 0;
    let overdue = 0;
    invoices.forEach(inv => {
      if (inv.status === "paid") paid++;
      else if (inv.status === "pending") pending++;
      else if (inv.status === "partially_paid") partiallyPaid++;
      else if (inv.status === "overdue") overdue++;
    });
    const invoiceStatusData = [
      { name: "Paid", value: paid, color: "#10b981" },
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "Partially Paid", value: partiallyPaid, color: "#3b82f6" },
      { name: "Overdue", value: overdue, color: "#ef4444" },
    ].filter(d => d.value > 0);

    // 7. Payment methods distribution
    const paymentModeData = [
      { name: "UPI Payment", value: invoicesCounts?.upiCollection || 0, color: "#4f46e5" },
      { name: "Cash Drawer", value: invoicesCounts?.cashCollection || 0, color: "#10b981" },
      { name: "Card Terminal", value: invoicesCounts?.cardCollection || 0, color: "#3b82f6" },
    ].filter(d => d.value > 0);

    // 8. Doctor load analysis
    const docMap: { [key: string]: number } = {};
    appointments.forEach(appt => {
      const docName = typeof appt.doctor === "object" && appt.doctor ? appt.doctor.name : String(appt.doctor);
      if (docName) {
        docMap[docName] = (docMap[docName] || 0) + 1;
      }
    });
    const workloadData = Object.keys(docMap).map(name => ({
      name: name.replace(/Dr\.\s*/g, ""),
      appointments: docMap[name]
    })).sort((a, b) => b.appointments - a.appointments).slice(0, 6);

    // Summary metrics
    const totalCollections = invoices.reduce((sum, inv) => sum + (inv.status === "paid" || inv.status === "partially_paid" ? (inv.totals?.total || 0) : 0), 0);
    const avgRevisitsPct = appointments.length > 0 ? Math.round((followUps / appointments.length) * 100) : 0;
    const activeIpCount = admissions.filter(a => a.status === "admitted" || a.status === "Admitted" || a.status === "Bed Allocated" || a.status === "In Ward").length;

    return {
      dailyRegistrationData,
      dailyCollectionsData,
      trafficData,
      revisitorData,
      appointmentStatusData,
      wardOccupancyData,
      invoiceStatusData,
      paymentModeData,
      workloadData,
      summary: {
        totalPatients: patients.length,
        totalAppointments: appointments.length,
        totalCollections,
        avgRevisitsPct,
        activeIpCount
      }
    };
  }, [patients, appointments, invoices, admissions, invoicesCounts]);

  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-400 font-medium">
        Loading live operations analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Operations KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Patient Pool</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-650">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-800">{data.summary.totalPatients}</p>
            <p className="mt-1 text-xs text-slate-500 font-medium font-semibold">Registered in system</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Consultation Bookings</span>
            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
              <Calendar className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-800">{data.summary.totalAppointments}</p>
            <p className="mt-1 text-xs text-slate-500 font-medium font-semibold">Total scheduled visits</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Follow-up Revisit Rate</span>
            <div className="rounded-lg bg-teal-50 p-2 text-teal-600">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-800">{data.summary.avgRevisitsPct}%</p>
            <p className="mt-1 text-xs text-slate-500 font-medium font-semibold">Free follow-up consultations</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Inpatients</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-800">{data.summary.activeIpCount}</p>
            <p className="mt-1 text-xs text-slate-500 font-medium font-semibold">Currently admitted in wards</p>
          </div>
        </div>
      </div>

      {/* SECTION 1: Workload & Growth Trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Registrations */}
        <ChartCard title="Daily Registrations" subtitle="Registration volumes for new patients over the last 7 days">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyRegistrationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="regGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                  labelClassName="font-bold text-slate-400 text-xs"
                />
                <Area type="monotone" dataKey="registrations" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#regGrad2)" name="New Patients" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Daily Collections */}
        <ChartCard title="Daily Collection Flow" subtitle="Aggregate payment collections from consultations over the last 7 days">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyCollectionsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                  formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Collected"]}
                  labelClassName="font-bold text-slate-400 text-xs"
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colGrad2)" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* SECTION 2: Front Desk Traffic & Queues */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Busy Hours Traffic */}
        <ChartCard title="Peak Desk Hours" subtitle="Outpatient consultation volumes by slot blocks">
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight={600} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                  labelClassName="font-bold text-slate-400 text-xs"
                />
                <Bar dataKey="patients" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Patients" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Revisitor Split */}
        <ChartCard title="Revisitor Ratio" subtitle="Proportion of new registrations vs follow-up consultations">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.revisitorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-xs font-semibold text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Appointment Statuses */}
        <ChartCard title="Appointment Queue Status" subtitle="Breakdown of today's visit statuses in the desk queue">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.appointmentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.appointmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-xs font-semibold text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* SECTION 3: Admissions & Billing Channels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bed Occupancy by Ward type */}
        <ChartCard title="Bed Occupancy by Ward" subtitle="Active inpatient allocations by ward type">
          <div className="h-72 w-full">
            {data.wardOccupancyData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">
                No active inpatient admissions.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.wardOccupancyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight={600} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                    labelClassName="font-bold text-slate-400 text-xs"
                  />
                  <Bar dataKey="value" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Admitted" barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* Invoice Payment Status */}
        <ChartCard title="Invoice Clearance Status" subtitle="Payment clearance distribution of generated bills">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.invoiceStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.invoiceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-xs font-semibold text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Mode of Payment Split */}
        <ChartCard title="Payment Method Distribution" subtitle="Distribution of collections by pay modes (Today)">
          <div className="h-72 w-full">
            {data.paymentModeData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">
                No collections logged today.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.paymentModeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={80}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {data.paymentModeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                    formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Total"]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-semibold text-slate-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>

      {/* SECTION 4: Doctor Workload */}
      <div className="grid grid-cols-1 gap-6">
        <ChartCard title="Practitioner Consultation Load" subtitle="Active patient appointment bookings per doctor (Top 6)">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.workloadData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff" }}
                  labelClassName="font-bold text-slate-400 text-xs"
                />
                <Bar dataKey="appointments" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Appointments" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
