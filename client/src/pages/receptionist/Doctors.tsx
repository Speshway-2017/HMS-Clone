import { useState, useEffect } from "react";
import { Stethoscope, User, ShieldAlert, List, HeartPulse } from "lucide-react";
import { useDoctorsAvailability } from "../../features/receptionist";
import { useDepartments } from "../../features/departments";
import { SelectField } from "../../components/ui/Field";
import { Card } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { isDoctorInDepartment, getDoctorDepartmentName } from "../../lib/doctorUtils";

interface Props {
  activeTab?: "availability" | "timings";
}

export function DoctorsPage({ activeTab = "availability" }: Props) {
  const [tab, setTab] = useState<"availability" | "timings">(activeTab);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  const [selectedDeptId, setSelectedDeptId] = useState("");

  const { data: doctors, isLoading } = useDoctorsAvailability();
  const { data: deptRes } = useDepartments();
  const departments = deptRes || [];

  const columns = [
    {
      header: "Doctor",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          {row.photoUrl ? (
            <img src={row.photoUrl} alt={row.name} className="h-7 w-7 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
              {row.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-slate-900">{row.name}</span>
        </div>
      )
    },
    {
      header: "Specialization",
      render: (row: any) => {
        const spec = row.specialization && row.specialization.trim() !== "" ? row.specialization.trim() : "—";
        return <span className="text-xs font-semibold text-slate-700">{spec}</span>;
      }
    },
    {
      header: "Department",
      render: (row: any) => <span className="text-xs">{getDoctorDepartmentName(row)}</span>
    },
    {
      header: "Duty Status",
      render: (row: any) => {
        const statuses: Record<string, { color: string; label: string }> = {
          on_duty: { color: "bg-green-50 text-green-700 border-green-200", label: "Available" },
          off_duty: { color: "bg-red-50 text-red-700 border-red-200", label: "Busy / Off-duty" },
          on_leave: { color: "bg-amber-50 text-amber-700 border-amber-200", label: "On Leave" }
        };
        const st = statuses[row.status] || { color: "bg-slate-50 text-slate-600 border-slate-200", label: row.status };
        return (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${st.color}`}>
            {st.label}
          </span>
        );
      }
    },
    {
      header: "Consultation Timings",
      render: (row: any) => {
        if (row.status === "on_leave") return <span className="text-xs text-slate-600">N/A</span>;
        
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayName = days[new Date().getDay()];
        const schedule = row.workingHours?.find((wh: any) => wh.day === dayName);
        
        if (schedule) {
          if (!schedule.active) return <span className="text-xs text-amber-600 font-medium">Off Today</span>;
          return <span className="text-xs text-slate-600">{schedule.from} - {schedule.to}</span>;
        }
        
        return <span className="text-xs text-slate-600">09:00 - 17:00</span>;
      }
    }
  ];

  const filteredDoctors = doctors?.filter(
    (d: any) => isDoctorInDepartment(d, selectedDeptId, departments)
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Doctors Registry</h1>
          <p className="text-sm text-slate-500">Monitor doctor duty logs, consulting status, and schedules.</p>
        </div>

        {/* Tab triggers */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setTab("availability")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "availability" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <List className="h-3.5 w-3.5" /> Doctor Statuses
          </button>
          <button
            onClick={() => setTab("timings")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              tab === "timings" ? "bg-navy-50 text-navy-700 font-bold" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <HeartPulse className="h-3.5 w-3.5" /> Timings Log
          </button>
        </div>
      </div>

      {tab === "availability" && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-bold text-slate-800">Doctors Availability Board</h2>
            <div className="w-full sm:w-56">
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="">All Departments</option>
                {departments.map((dept: any) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
          {isLoading ? (
            <div className="py-8 text-center text-slate-400">Loading Doctors...</div>
          ) : (
            <DataTable columns={columns} rows={filteredDoctors} rowKey={(row) => row._id} />
          )}
        </Card>
      )}

      {tab === "timings" && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-800 flex items-center gap-1.5">
            <Stethoscope className="h-5 w-5 text-navy-700" /> Standard Outpatient Timings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-100 p-4 bg-slate-50">
              <div className="font-bold text-xs text-slate-500 uppercase tracking-wide">Morning Sessions</div>
              <div className="mt-2 text-lg font-semibold text-slate-800">09:00 AM - 01:00 PM</div>
              <p className="text-[10px] text-slate-450 mt-1">Walk-ins and scheduled appointments.</p>
            </div>
            <div className="rounded-lg border border-slate-100 p-4 bg-slate-50">
              <div className="font-bold text-xs text-slate-500 uppercase tracking-wide">Afternoon Sessions</div>
              <div className="mt-2 text-lg font-semibold text-slate-800">02:00 PM - 05:00 PM</div>
              <p className="text-[10px] text-slate-450 mt-1">Follow-ups and scheduled consultations.</p>
            </div>
            <div className="rounded-lg border border-slate-100 p-4 bg-slate-50">
              <div className="font-bold text-xs text-slate-500 uppercase tracking-wide">Emergency Services</div>
              <div className="mt-2 text-lg font-semibold text-red-700">24 / 7 Active</div>
              <p className="text-[10px] text-slate-450 mt-1">On-call trauma and ICU duties.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
