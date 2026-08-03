import { useState, useMemo, useEffect } from "react";
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
  ChevronDown,
  ChevronUp,
  Filter,
  User,
  BarChart3,
  X
} from "lucide-react";
import { useNurseInpatients, useNurseNotifications, useNurseBeds, useNurseWards, useCompleteShiftHandover } from "../../features/nurse";
import { useDoctors } from "../../features/doctors";
import { useStaffProfileMe, useStaffList } from "../../features/staff";
import { useAuth } from "../../context/AuthContext";
import { tokenStorage } from "../../lib/tokenStorage";
import toast from "react-hot-toast";
import { DataTable, Column } from "../../components/ui/DataTable";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ChartCard } from "../../components/ui/ChartCard";

export function NurseDashboardPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  // Handover Dialog and input states
  const [isHandoverDialogOpen, setIsHandoverDialogOpen] = useState(false);
  const [selectedIncomingNurseId, setSelectedIncomingNurseId] = useState("");
  const [currentShift, setCurrentShift] = useState("Morning");
  const [nextShift, setNextShift] = useState("Evening");

  // Enforce rotation cycle: Morning -> Evening -> Night -> Morning
  useEffect(() => {
    if (currentShift === "Morning") {
      setNextShift("Evening");
    } else if (currentShift === "Evening") {
      setNextShift("Night");
    } else if (currentShift === "Night") {
      setNextShift("Morning");
    }
  }, [currentShift]);

  const [remarks, setRemarks] = useState("");
  const [nurseSignature, setNurseSignature] = useState("");
  const [submittingHandover, setSubmittingHandover] = useState(false);


  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWard, setSelectedWard] = useState("all");
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all"); // all | critical | pending_meds | pending_vitals
  const [taskTab, setTaskTab] = useState<"high" | "medium" | "completed">("high");

  const { data: inpatients = [], isLoading: loadingPatients, refetch: refetchPatients } = useNurseInpatients();
  const [selectedAdmissionIds, setSelectedAdmissionIds] = useState<string[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Initialize selected patient IDs when roster loads
  useEffect(() => {
    if (inpatients && inpatients.length > 0) {
      setSelectedAdmissionIds(inpatients.map((pt: any) => pt._id));
    }
  }, [inpatients]);

  const { data: notifications = [] } = useNurseNotifications();
  const { data: staffMe } = useStaffProfileMe();
  const { data: staffListResponse } = useStaffList({ role: "nurse" });
  
  const staffList = useMemo(() => {
    return Array.isArray(staffListResponse)
      ? staffListResponse
      : (staffListResponse as any)?.data || [];
  }, [staffListResponse]);

  const availableNurses = useMemo(() => {
    return staffList.filter((n: any) => n.email !== user?.email);
  }, [staffList, user]);

  const isReadOnly = useMemo(() => {
    return localStorage.getItem("nurse_shift_completed") === "true" || staffMe?.dutyStatus === "off_duty";
  }, [staffMe]);

  const completeHandoverMutation = useCompleteShiftHandover();
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

  // Compute Analytics data for the chart and progress bars
  const completionAnalytics = useMemo(() => {
    const total = inpatients.length;
    if (total === 0) {
      return {
        vitalsRate: 0,
        medsRate: 0,
        notesRate: 0,
        overallRate: 0,
        vitalsDoneCount: 0,
        medsDoneCount: 0,
        notesDoneCount: 0,
        chartData: []
      };
    }

    const vitalsDoneCount = inpatients.filter((pt: any) => pt.latestVitals && pt.vitalsRecordedToday).length;
    const medsDoneCount = inpatients.filter((pt: any) => pt.dueMedicationsCount === 0).length;
    const notesDoneCount = inpatients.filter((pt: any) => pt.notesRecordedToday).length;

    const vitalsRate = Math.round((vitalsDoneCount / total) * 100);
    const medsRate = Math.round((medsDoneCount / total) * 100);
    const notesRate = Math.round((notesDoneCount / total) * 100);
    const overallRate = Math.round((vitalsRate + medsRate + notesRate) / 3);

    const chartData = [
      { name: "Vitals Checks", Completed: vitalsDoneCount, Pending: Math.max(0, total - vitalsDoneCount) },
      { name: "Medications", Completed: medsDoneCount, Pending: Math.max(0, total - medsDoneCount) },
      { name: "Clinical Notes", Completed: notesDoneCount, Pending: Math.max(0, total - notesDoneCount) }
    ];

    return {
      vitalsRate,
      medsRate,
      notesRate,
      overallRate,
      vitalsDoneCount,
      medsDoneCount,
      notesDoneCount,
      chartData
    };
  }, [inpatients]);

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

  const handleCompleteHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncomingNurseId) {
      toast.error("Please select an incoming nurse to transfer duties.");
      return;
    }
    if (!nurseSignature.trim()) {
      toast.error("Handover sign-off requires signature");
      return;
    }

    setSubmittingHandover(true);
    const loadingToastId = toast.loading("Processing shift handover...");

    try {
      // Filter inpatients to only include those selected for handover
      const handoverPatients = inpatients.filter((pt: any) => selectedAdmissionIds.includes(pt._id));
      if (handoverPatients.length === 0) {
        toast.error("Please select at least one patient to hand over.");
        setSubmittingHandover(false);
        toast.dismiss(loadingToastId);
        return;
      }

      // Auto compile handover context
      const patientsCount = handoverPatients.length;
      const patientsHandedOverDetails = handoverPatients.map((item: any, idx: number) => {
        const name = item.patientName || item.patient?.name || "Unknown Patient";
        const room = item.room?.roomNumber || "N/A";
        const bed = item.bed?.bedNumber || "N/A";
        return `${idx + 1}. ${name} (Room ${room}, Bed ${bed})`;
      }).join("\n");

      const criticalPatients = handoverPatients
        .filter((item: any) => item.isCritical || item.priority === "Emergency" || item.priority === "Urgent")
        .map((item: any) => `${item.patientName || item.patient?.name || "Patient"} (Room ${item.room?.roomNumber || "N/A"}) - ${item.priority || "Routine"}`)
        .join("\n") || "None flagged today.";

      const pendingMedication = handoverPatients.map((item: any) => {
        const activeMeds = (item.medicationOrders || [])
          .filter((m: any) => m.status === "active")
          .map((m: any) => m.drugName)
          .join(", ");
        return activeMeds ? `${item.patientName || item.patient?.name || "Patient"}: ${activeMeds}` : null;
      }).filter(Boolean).join("\n") || "No active pending prescriptions today.";

      const pendingProcedures = "Routine patient checks & bedside vitals monitoring.";
      const specialInstructions = handoverPatients.map((item: any) => {
        return item.specialInstructions ? `${item.patientName || item.patient?.name || "Patient"}: ${item.specialInstructions}` : null;
      }).filter(Boolean).join("\n") || "No special instructions flagged.";

      const res = await completeHandoverMutation.mutateAsync({
        incomingNurseId: selectedIncomingNurseId,
        currentShift,
        nextShift,
        patientsHandedOverCount: patientsCount,
        patientsHandedOverDetails,
        pendingMedication,
        pendingProcedures,
        criticalPatients,
        specialInstructions,
        remarks: remarks || "None",
        nurseSignature,
        selectedAdmissionIds
      });

      // Save shift completed flag to local storage to trigger read-only state for current nurse
      localStorage.setItem("nurse_shift_completed", "true");

      toast.success("Shift handover completed successfully.", { id: loadingToastId });
      
      // Reset & close dialog
      setIsHandoverDialogOpen(false);
      setSelectedIncomingNurseId("");
      setRemarks("");
      setNurseSignature("");
      refetchPatients();
    } catch (err: any) {
      toast.error(err.message || "Failed to process shift handover.", { id: loadingToastId });
    } finally {
      setSubmittingHandover(false);
    }
  };

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
      render: (row) => (
        <span className="text-xs font-bold text-slate-800">
          {row.admittingDoctor?.name || (typeof row.admittingDoctor === "string" ? row.admittingDoctor : null) || row.doctorName || row.doctor?.name || "Dr. Unassigned"}
        </span>
      ),
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
      {/* Read-Only Status Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs font-semibold text-amber-800 flex items-center gap-2 mb-4 animate-fadeIn">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 animate-pulse" />
          <div>
            <p className="font-bold text-amber-900">Shift Handed Over / Completed</p>
            <p className="text-[11px] text-amber-750 mt-0.5">Your shift has been successfully completed. You are now in read-only mode. Editing features and new patient brief entries are disabled.</p>
          </div>
        </div>
      )}

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
            onClick={() => setIsHandoverDialogOpen(true)}
            disabled={isReadOnly}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition-all ${
              isReadOnly 
                ? "bg-slate-300 cursor-not-allowed opacity-60 text-slate-500" 
                : "bg-red-650 hover:bg-red-700 text-white"
            }`}
          >
            <Clock className="h-4 w-4" /> {isReadOnly ? "Shift Completed" : "End Shift"}
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
          onClick={() => {
            if (!isReadOnly) {
              setIsHandoverDialogOpen(true);
            }
          }}
          className={`rounded-xl border p-4 shadow-sm transition hover:shadow-md flex flex-col justify-between h-full ${
            isReadOnly 
              ? "border-slate-200 bg-slate-50 cursor-not-allowed" 
              : "cursor-pointer border-slate-200 bg-white hover:border-emerald-300"
          }`}
        >
          <p className="text-[11.5px] font-semibold text-slate-500 truncate tracking-tight" title="Shift Status">Shift Status</p>
          <p className="mt-2 text-lg sm:text-xl md:text-2xl font-extrabold text-emerald-600 leading-tight">{currentShiftName}</p>
          <span className="mt-1 inline-block text-[11px] text-slate-400 truncate">
            {isReadOnly ? "Handover Completed" : "Click to End Shift →"}
          </span>
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

      {/* 3.5 Shift Productivity & Process Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Progress Bars & Summary */}
        <div className="lg:col-span-1">
          <ChartCard title="Shift Completion Progress" subtitle="Real-time status of your assigned tasks">
            <div className="space-y-4 pt-2">
              {/* Overall progress indicator */}
              <div className="flex items-center justify-between border-b pb-3 mb-2">
                <span className="text-xs font-bold text-slate-700">Overall Process Completion</span>
                <span className={`text-sm font-extrabold rounded-full px-2.5 py-0.5 ${
                  completionAnalytics.overallRate >= 80 ? 'bg-emerald-100 text-emerald-800' :
                  completionAnalytics.overallRate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {completionAnalytics.overallRate}%
                </span>
              </div>

              {/* Vitals Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Vitals Monitoring</span>
                  <span className="text-slate-900 font-bold">{completionAnalytics.vitalsDoneCount} / {inpatients.length} Checked</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500 ease-in-out" 
                    style={{ width: `${completionAnalytics.vitalsRate}%` }}
                  />
                </div>
              </div>

              {/* Medications Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-650">Medication Administration</span>
                  <span className="text-slate-900 font-bold">{completionAnalytics.medsDoneCount} / {inpatients.length} Completed</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-500 ease-in-out" 
                    style={{ width: `${completionAnalytics.medsRate}%` }}
                  />
                </div>
              </div>

              {/* Progress Notes Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-650">Nursing Notes Entry</span>
                  <span className="text-slate-900 font-bold">{completionAnalytics.notesDoneCount} / {inpatients.length} Logged</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-650 transition-all duration-500 ease-in-out" 
                    style={{ width: `${completionAnalytics.notesRate}%` }}
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-400 font-medium italic pt-2 border-t border-slate-100">
                * Complete all pending vitals, medicines, and notes to wrap up your shift roster.
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Right Column: Recharts Chart */}
        <div className="lg:col-span-2">
          <ChartCard title="Task Completion Analysis" subtitle="Process breakdown by status (Completed vs Pending)">
            <div className="h-64 w-full pt-2">
              {inpatients.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No active patients on roster to display process analytics.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={completionAnalytics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} dy={8} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} dx={-8} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="Completed"
                      stroke="#1e3a8a"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#completedGrad)"
                      activeDot={{ r: 6 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Pending"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#pendingGrad)"
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
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

      {/* 5. Custom Shift Handover Confirmation Modal Dialog */}
      {isHandoverDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl my-8 flex flex-col border border-slate-100 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b mb-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                  <Clock className="h-5 w-5 text-red-600 animate-pulse" /> Shift Handover & End Shift Confirmation
                </h3>
                <p className="text-xs text-slate-400 font-sans">Specify incoming nurse and signature to complete shift handoff audit logs.</p>
              </div>
              <button 
                onClick={() => setIsHandoverDialogOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteHandover} className="flex-1 overflow-y-auto pr-1 space-y-5 text-xs font-semibold text-slate-600">
              
              {/* Part A: Incoming Nurse Selection Table */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Select Incoming Nurse for Next Shift (Required)
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[220px] overflow-y-auto bg-slate-50/30">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-550 border-b border-slate-200 text-[10px] uppercase font-bold">
                        <th className="p-3 text-center w-12">Select</th>
                        <th className="p-3">Nurse Name</th>
                        <th className="p-3">Emp ID</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Next Shift</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Patients</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {availableNurses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                            No incoming nurses available on rosters today.
                          </td>
                        </tr>
                      ) : (
                        availableNurses.map((nurse: any) => {
                          const isSelected = selectedIncomingNurseId === nurse._id;
                          return (
                            <tr 
                              key={nurse._id}
                              onClick={() => setSelectedIncomingNurseId(nurse._id)}
                              className={`hover:bg-slate-50/80 cursor-pointer transition ${
                                isSelected ? "bg-navy-50/60" : ""
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="radio"
                                  name="incomingNurse"
                                  checked={isSelected}
                                  onChange={() => setSelectedIncomingNurseId(nurse._id)}
                                  className="h-3.5 w-3.5 text-navy-900 border-slate-300 focus:ring-navy-950"
                                />
                              </td>
                              <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-slate-100 font-extrabold text-[10px] text-slate-600 flex items-center justify-center border">
                                  {nurse.name.charAt(0)}
                                </div>
                                {nurse.name}
                              </td>
                              <td className="p-3 text-slate-500 font-medium">{nurse.employeeId || "N/A"}</td>
                              <td className="p-3 text-slate-550 font-medium">
                                {typeof nurse.department === "object" ? nurse.department?.name : (nurse.department || "General Ward")}
                              </td>
                              <td className="p-3">
                                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                                  {nurse.shift || "Evening"}
                                </span>
                              </td>
                              <td className="p-3 font-medium">
                                <span className={`h-2 w-2 rounded-full inline-block mr-1.5 ${
                                  nurse.dutyStatus === "on_duty" ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                                }`} />
                                <span className="capitalize">{nurse.dutyStatus?.replace("_", " ") || "Off Duty"}</span>
                              </td>
                              <td className="p-3 text-center font-bold text-slate-700">
                                {nurse.assignedPatientCount ?? 0}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Part A2: Patient Assignment Checklist Selector (Collapsible Dropdown) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Select Assigned Patients to Hand Over (Required)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPatientDropdown(!showPatientDropdown)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white text-slate-700 font-bold text-xs flex justify-between items-center cursor-pointer shadow-sm hover:border-slate-300 transition-all"
                >
                  <span>
                    {selectedAdmissionIds.length === 0 
                      ? "Select Patients (0 Selected)" 
                      : `Select Patients (${selectedAdmissionIds.length} of ${inpatients?.length || 0} Selected)`}
                  </span>
                  {showPatientDropdown ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {showPatientDropdown && (
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/30 max-h-[180px] overflow-y-auto space-y-2 mt-2 animate-fadeIn">
                    {inpatients.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No assigned patients to transfer.</p>
                    ) : (
                      inpatients.map((pt: any) => {
                        const isChecked = selectedAdmissionIds.includes(pt._id);
                        const name = pt.patientName || pt.patient?.name || "Inpatient";
                        const room = pt.roomNumber || pt.room?.roomNumber || "N/A";
                        const bed = pt.bedNumber || pt.bed?.bedNumber || "N/A";
                        return (
                          <label 
                            key={pt._id}
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-150 hover:bg-slate-50 transition cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedAdmissionIds(selectedAdmissionIds.filter(id => id !== pt._id));
                                } else {
                                  setSelectedAdmissionIds([...selectedAdmissionIds, pt._id]);
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-655 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="flex-1 flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-800">{name}</span>
                              <span className="text-[10px] text-slate-500 font-medium">Room {room}, Bed {bed}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Part B: Shift Handover Form Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Current Shift</label>
                  <select
                    value={currentShift}
                    onChange={(e) => setCurrentShift(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Night">Night Shift</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Incoming Shift (Auto-calculated)</label>
                  <select
                    value={nextShift}
                    disabled={true}
                    className="w-full rounded-lg border border-slate-200 p-2.5 outline-none bg-slate-50 text-slate-500 cursor-not-allowed"
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Night">Night Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Handoff Remarks & Special Roster Notes (Optional)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter details on patient updates, clinical checkpoints, or tasks to flag..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-indigo-500 bg-white text-xs font-semibold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Outgoing Nurse Signature Sign-off (Required)
                </label>
                <input
                  type="text"
                  value={nurseSignature}
                  onChange={(e) => setNurseSignature(e.target.value)}
                  placeholder="Type your name (e.g. Sarah Connor, RN) to sign off..."
                  className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-indigo-500 bg-white font-bold text-slate-700"
                />
              </div>

              {/* Part C: Action Control Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHandoverDialogOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-650 hover:bg-slate-50 cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedIncomingNurseId || !nurseSignature.trim() || submittingHandover}
                  className={`px-5 py-2 rounded-xl text-white font-bold cursor-pointer transition flex items-center gap-1.5 ${
                    !selectedIncomingNurseId || !nurseSignature.trim() || submittingHandover
                      ? "bg-slate-300 cursor-not-allowed opacity-60 text-slate-500"
                      : "bg-red-650 hover:bg-red-700 shadow-md shadow-red-200"
                  }`}
                >
                  {submittingHandover ? "Ending Shift..." : "Complete Handover"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
