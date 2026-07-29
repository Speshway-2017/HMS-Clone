import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Activity,
  Pill,
  FileText,
  BedDouble,
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  ShieldAlert,
  ChevronRight,
  Filter,
  User
} from "lucide-react";
import { useNurseInpatients, useNurseNotifications, useNurseBeds, useNurseWards } from "../../features/nurse";
import { useDoctors } from "../../features/doctors";
import { DataTable, Column } from "../../components/ui/DataTable";

export function NurseDashboardPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWard, setSelectedWard] = useState("all");
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all"); // all | critical | pending_meds | pending_vitals
  const [taskTab, setTaskTab] = useState<"high" | "medium" | "completed">("high");

  const { data: inpatients = [], isLoading: loadingPatients, refetch: refetchPatients } = useNurseInpatients();
  const { data: notifications = [] } = useNurseNotifications();
  const { data: beds = [] } = useNurseBeds();
  const { data: wards = [] } = useNurseWards();
  const { data: doctorsResponse } = useDoctors({ limit: 100 });

  const doctorsList = useMemo(() => {
    return Array.isArray(doctorsResponse) ? doctorsResponse : (doctorsResponse?.data || []);
  }, [doctorsResponse]);

  // Compute Live Metrics for 6 KPI Cards
  const metrics = useMemo(() => {
    const totalAssigned = inpatients.length;

    let medDueCount = 0;
    let criticalCount = 0;
    let pendingVitalsCount = 0;
    let pendingNotesCount = 0;

    inpatients.forEach((pt: any) => {
      const hasMedDue = pt.dueMedicationsCount > 0 || (pt.medications && pt.medications.some((m: any) => m.status === "Pending"));
      if (hasMedDue) medDueCount++;

      const isCrit = pt.isCritical || pt.priority === "Emergency" || pt.careLevel === "ICU" || (pt.latestVitals && (Number(pt.latestVitals.oxygenSaturation) < 92 || Number(pt.latestVitals.temperature) > 102));
      if (isCrit) criticalCount++;

      if (!pt.latestVitals || !pt.vitalsRecordedToday) pendingVitalsCount++;
      if (!pt.notesRecordedToday) pendingNotesCount++;
    });

    return {
      totalAssigned,
      medDueCount,
      criticalCount,
      pendingVitalsCount,
      pendingNotesCount,
      alertsCount: notifications.length,
    };
  }, [inpatients, notifications]);

  // Compute Task Priorities
  const tasks = useMemo(() => {
    const high: any[] = [];
    const medium: any[] = [];
    const completed: any[] = [];

    inpatients.forEach((pt: any) => {
      const pName = pt.patientName || pt.patient?.name || "Inpatient";
      const bedInfo = `Room ${pt.roomNumber || pt.room?.roomNumber || '101'}, Bed ${pt.bedNumber || pt.bed?.bedNumber || 'N/A'}`;

      if (pt.isCritical || (pt.latestVitals && Number(pt.latestVitals.oxygenSaturation) < 92)) {
        high.push({
          id: `task-crit-${pt._id}`,
          title: `Critical Alert: ${pName}`,
          subtitle: `Low SpO2 (${pt.latestVitals?.oxygenSaturation || '90'}%) - Immediate Doctor Review`,
          type: "critical",
          patientId: pt._id,
        });
      }

      if (pt.dueMedicationsCount > 0) {
        high.push({
          id: `task-med-${pt._id}`,
          title: `Medication Overdue: ${pName}`,
          subtitle: `${pt.dueMedicationsCount} dose(s) pending administration`,
          type: "medication",
          patientId: pt._id,
        });
      }

      if (!pt.latestVitals || !pt.vitalsRecordedToday) {
        medium.push({
          id: `task-vit-${pt._id}`,
          title: `Vitals Check Due: ${pName}`,
          subtitle: `Scheduled shift vital signs recording (${bedInfo})`,
          type: "vitals",
          patientId: pt._id,
        });
      }

      if (!pt.notesRecordedToday) {
        medium.push({
          id: `task-note-${pt._id}`,
          title: `Nursing Note Entry: ${pName}`,
          subtitle: `Shift observations & care plan progress log`,
          type: "notes",
          patientId: pt._id,
        });
      }

      if (pt.vitalsRecordedToday && pt.dueMedicationsCount === 0) {
        completed.push({
          id: `task-done-${pt._id}`,
          title: `Care Completed: ${pName}`,
          subtitle: `Vitals & medications logged up to date`,
          type: "done",
          patientId: pt._id,
        });
      }
    });

    return { high, medium, completed };
  }, [inpatients]);

  // Filtered Patient Roster
  const filteredPatients = useMemo(() => {
    return inpatients.filter((pt: any) => {
      const pName = pt.patientName || pt.patient?.name || "";
      const pUhid = pt.uhid || pt.patient?.uhid || "";
      const wardName = pt.wardName || pt.ward?.name || "";
      const docName = pt.doctorName || pt.doctor?.name || "";

      const matchesSearch = pName.toLowerCase().includes(searchTerm.toLowerCase()) || pUhid.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesWard = selectedWard === "all" || wardName.toLowerCase() === selectedWard.toLowerCase();
      const matchesDoctor = selectedDoctor === "all" || docName.toLowerCase() === selectedDoctor.toLowerCase();

      let matchesPriority = true;
      if (priorityFilter === "critical") {
        matchesPriority = pt.isCritical || pt.priority === "Emergency" || pt.careLevel === "ICU" || (pt.latestVitals && Number(pt.latestVitals.oxygenSaturation) < 92);
      } else if (priorityFilter === "pending_meds") {
        matchesPriority = pt.dueMedicationsCount > 0;
      } else if (priorityFilter === "pending_vitals") {
        matchesPriority = !pt.latestVitals || !pt.vitalsRecordedToday;
      }

      return matchesSearch && matchesWard && matchesDoctor && matchesPriority;
    });
  }, [inpatients, searchTerm, selectedWard, selectedDoctor, priorityFilter]);

  // Roster Columns
  const columns: Column<any>[] = [
    {
      header: "Patient",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-navy-800 font-extrabold text-xs">
            {(row.patientName || row.patient?.name || "P").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900">{row.patientName || row.patient?.name || "Inpatient"}</p>
            <p className="text-[11px] text-slate-500">{row.age || "35"} yrs | {row.gender || "Gender N/A"}</p>
          </div>
        </div>
      ),
    },
    {
      header: "UHID",
      render: (row) => <span className="font-mono text-xs font-bold text-slate-700">{row.uhid || row.patient?.uhid || "UHID-N/A"}</span>,
    },
    {
      header: "Ward",
      render: (row) => <span className="text-xs font-semibold text-slate-700">{row.wardName || row.ward?.name || "General Ward"}</span>,
    },
    {
      header: "Bed",
      render: (row) => (
        <span className="rounded bg-navy-50 px-2.5 py-1 text-xs font-extrabold text-navy-800">
          {row.bedNumber || row.bed?.bedNumber || "Bed 01"}
        </span>
      ),
    },
    {
      header: "Doctor",
      render: (row) => <span className="text-xs font-bold text-slate-800">{row.doctorName || row.doctor?.name || "Dr. Assigned"}</span>,
    },
    {
      header: "Latest Vitals",
      render: (row) => {
        const v = row.latestVitals;
        if (!v) return <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">Check Pending</span>;

        const isAlert = Number(v.oxygenSaturation) < 94 || Number(v.temperature) > 100.4;
        return (
          <div className="space-y-0.5 text-xs">
            <span className={`inline-flex items-center gap-1 font-bold ${isAlert ? 'text-red-600' : 'text-slate-800'}`}>
              BP: {v.bloodPressure || "120/80"}
            </span>
            <p className="text-[10px] text-slate-500">SpO2: {v.oxygenSaturation || "98"}% | Temp: {v.temperature || "98.6"}°F</p>
          </div>
        );
      },
    },
    {
      header: "Medication Status",
      render: (row) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${row.dueMedicationsCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {row.dueMedicationsCount > 0 ? `${row.dueMedicationsCount} Pending` : 'Administered'}
        </span>
      ),
    },
    {
      header: "Priority",
      render: (row) => {
        const isCrit = row.isCritical || row.priority === "Emergency" || row.careLevel === "ICU" || (row.latestVitals && Number(row.latestVitals.oxygenSaturation) < 92);
        const isMedPending = row.dueMedicationsCount > 0;
        const isVitPending = !row.latestVitals || !row.vitalsRecordedToday;

        if (isCrit) {
          return <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[11px] font-extrabold uppercase text-red-800">Critical</span>;
        } else if (isMedPending) {
          return <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold uppercase text-amber-800">Med Due</span>;
        } else if (isVitPending) {
          return <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[11px] font-extrabold uppercase text-blue-800">Vitals Due</span>;
        }
        return <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold uppercase text-emerald-800">Stable</span>;
      },
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/nurse/patients`)}
            className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
            title="View Patient Details"
          >
            View
          </button>
          <button
            onClick={() => navigate(`/nurse/vitals?patientId=${row._id}`)}
            className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
            title="Record Vitals"
          >
            Vitals
          </button>
          <button
            onClick={() => navigate(`/nurse/medications?patientId=${row._id}`)}
            className="rounded bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100"
            title="Medications"
          >
            Meds
          </button>
          <button
            onClick={() => navigate(`/nurse/notes?patientId=${row._id}`)}
            className="rounded bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700 hover:bg-teal-100"
            title="Clinical Notes"
          >
            Notes
          </button>
        </div>
      ),
    },
  ];

  // Calculate active shift name dynamically
  const currentShiftName = useMemo(() => {
    const hr = new Date().getHours();
    if (hr >= 7 && hr < 15) return "Morning Shift";
    if (hr >= 15 && hr < 23) return "Evening Shift";
    return "Night Shift";
  }, []);

  // Helper handler to set filter & scroll to table
  const handleCardFilterClick = (filterKey: string) => {
    setPriorityFilter(filterKey);
    const tableEl = document.getElementById("shift-roster-table");
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-navy-900 text-white p-1.5">
              <Activity className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900">Nurse Dashboard</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Enterprise clinical dashboard: monitor shift roster, medication schedules, vitals alarms & task priorities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetchPatients()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh Roster
          </button>
          <button
            onClick={() => navigate("/nurse/shift-handover")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-navy-800"
          >
            <FileText className="h-4 w-4" /> Shift Handover
          </button>
        </div>
      </div>

      {/* 2. Critical Alert Banner (Only visible when critical alarms active) */}
      {metrics.criticalCount > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm text-red-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-red-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-800">Critical Clinical Alarm Flagged</h4>
              <p className="text-xs text-red-700 font-medium">
                {metrics.criticalCount} patient(s) currently require immediate vitals evaluation / ICU protocol review.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleCardFilterClick("critical")}
            className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-red-700 shrink-0"
          >
            Filter Critical Patients ({metrics.criticalCount})
          </button>
        </div>
      )}

      {/* 3. Meaningful 6 KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div
          onClick={() => handleCardFilterClick("all")}
          className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md flex flex-col justify-between h-full ${
            priorityFilter === "all" ? "ring-2 ring-navy-900 border-navy-900 bg-navy-50/20" : "border-slate-200"
          }`}
        >
          <p className="text-[11.5px] font-semibold text-slate-500 truncate tracking-tight" title="Assigned Patients">Assigned Patients</p>
          <p className="mt-2 text-2xl font-extrabold text-navy-900">{metrics.totalAssigned}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Shift Roster</span>
        </div>

        <div
          onClick={() => handleCardFilterClick("pending_meds")}
          className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md flex flex-col justify-between h-full ${
            priorityFilter === "pending_meds" ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50/20" : "border-slate-200"
          }`}
        >
          <p className="text-[11.5px] font-semibold text-slate-500 truncate tracking-tight" title="Pending Medications">Pending Medications</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">{metrics.medDueCount}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Doses Pending</span>
        </div>

        <div
          onClick={() => handleCardFilterClick("pending_vitals")}
          className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md flex flex-col justify-between h-full ${
            priorityFilter === "pending_vitals" ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/20" : "border-slate-200"
          }`}
        >
          <p className="text-[11.5px] font-semibold text-slate-500 truncate tracking-tight" title="Pending Vitals">Pending Vitals</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-600">{metrics.pendingVitalsCount}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Check Scheduled</span>
        </div>

        <div
          onClick={() => handleCardFilterClick("critical")}
          className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md flex flex-col justify-between h-full ${
            priorityFilter === "critical" ? "ring-2 ring-red-500 border-red-500 bg-red-50/20" : "border-slate-200"
          }`}
        >
          <p className="text-[11.5px] font-semibold text-slate-500 truncate tracking-tight" title="Critical Patients">Critical Patients</p>
          <p className="mt-2 text-2xl font-extrabold text-red-600">{metrics.criticalCount}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">ICU / Vitals Alert</span>
        </div>

        <div
          onClick={() => navigate("/nurse/shift-handover")}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md flex flex-col justify-between h-full hover:border-emerald-300"
        >
          <p className="text-[11.5px] font-semibold text-slate-500 truncate tracking-tight" title="Shift Status">Shift Status</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600 truncate">{currentShiftName}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Click to Handover →</span>
        </div>

        <div
          onClick={() => navigate("/nurse/alerts")}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md flex flex-col justify-between h-full hover:border-purple-300"
        >
          <p className="text-[11.5px] font-semibold text-slate-500 truncate tracking-tight" title="Nurse Alerts">Nurse Alerts</p>
          <p className="mt-2 text-2xl font-extrabold text-purple-600">{metrics.alertsCount}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">Click to Alarms →</span>
        </div>
      </div>

      {/* 4. Task Priority Panel ("Today's Nursing Tasks") */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Today's Nursing Tasks</h3>
            <p className="text-xs text-slate-500">Prioritized daily clinical action items and shift nursing tasks</p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs font-bold">
            <button
              onClick={() => setTaskTab("high")}
              className={`rounded-md px-3 py-1 text-xs transition ${taskTab === "high" ? "bg-red-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              High Priority ({tasks.high.length})
            </button>
            <button
              onClick={() => setTaskTab("medium")}
              className={`rounded-md px-3 py-1 text-xs transition ${taskTab === "medium" ? "bg-navy-900 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              Medium Priority ({tasks.medium.length})
            </button>
            <button
              onClick={() => setTaskTab("completed")}
              className={`rounded-md px-3 py-1 text-xs transition ${taskTab === "completed" ? "bg-emerald-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}
            >
              Completed ({tasks.completed.length})
            </button>
          </div>
        </div>

        {/* Task Cards Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {taskTab === "high" && tasks.high.length === 0 && (
            <p className="col-span-full py-4 text-center text-xs text-slate-400">No high priority urgent tasks pending.</p>
          )}
          {taskTab === "medium" && tasks.medium.length === 0 && (
            <p className="col-span-full py-4 text-center text-xs text-slate-400">No medium priority tasks pending.</p>
          )}
          {taskTab === "completed" && tasks.completed.length === 0 && (
            <p className="col-span-full py-4 text-center text-xs text-slate-400">No completed tasks logged for this shift yet.</p>
          )}

          {(taskTab === "high" ? tasks.high : taskTab === "medium" ? tasks.medium : tasks.completed).map((t) => (
            <div
              key={t.id}
              className={`rounded-lg border p-3.5 shadow-sm space-y-1.5 transition ${
                t.type === 'critical'
                  ? 'border-red-200 bg-red-50/40'
                  : t.type === 'medication'
                  ? 'border-amber-200 bg-amber-50/40'
                  : t.type === 'done'
                  ? 'border-emerald-200 bg-emerald-50/30'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{t.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${t.type === 'critical' ? 'bg-red-100 text-red-800' : t.type === 'medication' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                  {t.type}
                </span>
              </div>
              <p className="text-xs text-slate-600">{t.subtitle}</p>
              <div className="pt-1 flex justify-end">
                <button
                  onClick={() => {
                    if (t.type === 'medication') navigate(`/nurse/medications?patientId=${t.patientId}`);
                    else if (t.type === 'vitals' || t.type === 'critical') navigate(`/nurse/vitals?patientId=${t.patientId}`);
                    else navigate(`/nurse/notes?patientId=${t.patientId}`);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-navy-900 hover:underline"
                >
                  Take Action <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Primary Section: Shift Inpatient Roster Table */}
      <div id="shift-roster-table" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Shift Inpatient Roster</h3>
              <p className="text-xs text-slate-500">Live roster of patients assigned to your shift with row priority highlighting</p>
            </div>
            {priorityFilter !== "all" && (
              <button
                onClick={() => setPriorityFilter("all")}
                className="rounded-full bg-navy-100 px-3 py-1 text-xs font-bold text-navy-800 hover:bg-navy-200 flex items-center gap-1"
              >
                Reset Filter ✕
              </button>
            )}
          </div>

          {/* Expanded Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Patient, UHID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:border-navy-900 focus:outline-none"
              />
            </div>

            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Wards</option>
              {wards.map((w: any) => (
                <option key={w._id} value={w.name}>{w.name}</option>
              ))}
            </select>

            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Doctors</option>
              {doctorsList.map((d: any) => (
                <option key={d._id} value={d.name}>{d.name}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Priority Levels</option>
              <option value="critical">Critical Only</option>
              <option value="pending_meds">Pending Medication</option>
              <option value="pending_vitals">Pending Vitals</option>
            </select>
          </div>
        </div>

        {/* Reusable Standard DataTable Component */}
        <DataTable
          columns={columns}
          rows={filteredPatients}
          rowKey={(r: any) => r._id || Math.random().toString()}
          emptyMessage="No patients assigned during this shift matching criteria."
        />
      </div>
    </div>
  );
}
