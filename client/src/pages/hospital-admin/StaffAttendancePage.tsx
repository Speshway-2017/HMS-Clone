import { useState, useEffect } from "react";
import {
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Users,
  CheckSquare,
  AlertTriangle,
  Zap,
  TrendingUp,
  Activity,
  PencilLine,
  ShieldCheck,
  Filter,
  X,
} from "lucide-react";
import { useDailyAttendance, useMonthlyAttendanceSummary, useAttendanceHistory, useMarkSingleAttendance, useBulkMarkAttendance, AttendanceRecord } from "../../features/attendance";
import { useStaffList } from "../../features/staff";
import { useDoctors } from "../../features/doctors";
import { useDepartments } from "../../features/departments";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/ui/KpiCard";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { InputField, SelectField } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { socket } from "../../lib/socket";
import { AttendanceCorrectionDialog } from "../../components/admin-dashboard/AttendanceCorrectionDialog";

export function StaffAttendancePage() {
  const [activeTab, setActiveTab] = useState<"daily" | "monthly" | "history">("daily");
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedShift, setSelectedShift] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [activeKpiFilter, setActiveKpiFilter] = useState<"all" | "present" | "absent" | "leave" | "halfDay" | "late" | "overtime">("all");
  const [search, setSearch] = useState("");

  // Modals
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("Present");
  const [bulkShift, setBulkShift] = useState<string>("General");

  // Manual Correction Dialog
  const [correctionRecord, setCorrectionRecord] = useState<AttendanceRecord | null>(null);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);

  // Queries
  const { data: dailyData, isLoading: dailyLoading, refetch: refetchDaily } = useDailyAttendance({
    date: selectedDate,
    department: selectedDept || undefined,
    shift: selectedShift || undefined,
    status: selectedStatus || undefined,
    search: search || undefined,
  });

  const { data: monthlyData, isLoading: monthlyLoading, refetch: refetchMonthly } = useMonthlyAttendanceSummary({
    month: selectedMonth,
    department: selectedDept || undefined,
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useAttendanceHistory({
    fromDate: selectedDate,
    toDate: selectedDate,
  });

  const { data: staffRes } = useStaffList({});
  const { data: docRes } = useDoctors({} as any);
  const { data: deptsRes } = useDepartments();

  const markSingle = useMarkSingleAttendance();
  const markBulk = useBulkMarkAttendance();

  // Socket.IO Real-time automatic listener (No manual refresh!)
  useEffect(() => {
    const handleSocketUpdate = () => {
      refetchDaily();
      refetchMonthly();
      refetchHistory();
    };

    socket.on("attendance:updated", handleSocketUpdate);
    socket.on("leave:updated", handleSocketUpdate);
    socket.on("dashboard_update", handleSocketUpdate);

    return () => {
      socket.off("attendance:updated", handleSocketUpdate);
      socket.off("leave:updated", handleSocketUpdate);
      socket.off("dashboard_update", handleSocketUpdate);
    };
  }, [refetchDaily, refetchMonthly, refetchHistory]);

  // Combine Staff & Doctors to form complete employee list
  const allEmployees: any[] = [];
  if (docRes?.data) {
    docRes.data.forEach((doc: any) => {
      // Visiting Consultants and On-Call Doctors must NOT appear in Staff Attendance
      if (doc.doctorType === "Visiting" || doc.doctorType === "On-Call") return;

      allEmployees.push({
        _id: doc._id,
        employeeId: doc.licenseNo || `DOC-${doc._id.slice(-5).toUpperCase()}`,
        name: doc.name,
        role: "Doctor",
        designation: doc.specialization ? `Doctor (${doc.specialization})` : "Doctor",
        department: doc.department?.name || "Medical",
        departmentId: doc.department?._id || doc.department,
        type: "Doctor",
        shift: doc.shift || "General",
      });
    });
  }
  if (staffRes?.data) {
    staffRes.data.forEach((st: any) => {
      allEmployees.push({
        _id: st._id,
        employeeId: st.employeeId || `STF-${st._id.slice(-5).toUpperCase()}`,
        name: st.name,
        designation: st.role || "Staff Member",
        department: st.department?.name || "General",
        departmentId: st.department?._id || st.department,
        type: "Staff",
        shift: st.shift || "General",
      });
    });
  }

  // Map of existing daily records for easy lookup
  const recordMap = new Map<string, any>();
  if (dailyData?.records) {
    dailyData.records.forEach((rec) => {
      recordMap.set(rec.employeeId, rec);
    });
  }

  const [selectedRole, setSelectedRole] = useState("");

  // Filtered employees for daily marking view with active KPI Card filtering
  const filteredEmployees = allEmployees.filter((emp) => {
    const rec = recordMap.get(emp.employeeId);
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || emp.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !selectedDept || emp.departmentId === selectedDept;
    const matchesShift = !selectedShift || emp.shift === selectedShift;
    const matchesRole = !selectedRole || (emp.role && emp.role.toLowerCase().includes(selectedRole.toLowerCase())) || (emp.designation && emp.designation.toLowerCase().includes(selectedRole.toLowerCase())) || (emp.type && emp.type.toLowerCase() === selectedRole.toLowerCase());

    let matchesKpi = true;
    if (activeKpiFilter === "present") {
      matchesKpi = rec?.status === "Present";
    } else if (activeKpiFilter === "absent") {
      matchesKpi = rec?.status === "Absent";
    } else if (activeKpiFilter === "leave") {
      matchesKpi = rec?.status === "Paid Leave" || rec?.status === "Unpaid Leave (LOP)";
    } else if (activeKpiFilter === "halfDay") {
      matchesKpi = rec?.status === "Half Day";
    } else if (activeKpiFilter === "late") {
      matchesKpi = rec?.isLate === true;
    } else if (activeKpiFilter === "overtime") {
      matchesKpi = (rec?.overtimeHours || 0) > 0;
    } else if (selectedStatus) {
      matchesKpi = rec?.status === selectedStatus;
    }

    return matchesSearch && matchesDept && matchesShift && matchesRole && matchesKpi;
  });

  const toggleKpiFilter = (filter: typeof activeKpiFilter) => {
    if (activeKpiFilter === filter) {
      setActiveKpiFilter("all");
      setSelectedStatus("");
    } else {
      setActiveKpiFilter(filter);
      if (filter === "present") setSelectedStatus("Present");
      else if (filter === "absent") setSelectedStatus("Absent");
      else if (filter === "halfDay") setSelectedStatus("Half Day");
      else if (filter === "leave") setSelectedStatus("Paid Leave");
      else setSelectedStatus("");
    }
  };

  // Dashboard KPI Calculations
  const recordsList = dailyData?.records || [];
  const todayPresent = recordsList.filter((r) => r.status === "Present").length;
  const todayAbsent = recordsList.filter((r) => r.status === "Absent").length;
  const todayOnLeave = recordsList.filter((r) => r.status === "Paid Leave" || r.status === "Unpaid Leave (LOP)").length;
  const todayHalfDay = recordsList.filter((r) => r.status === "Half Day").length;
  const todayLate = recordsList.filter((r) => r.isLate).length;
  const todayOvertime = recordsList.filter((r) => (r.overtimeHours || 0) > 0).length;
  
  const totalHoursWorked = recordsList.reduce((sum, r) => sum + (r.workingHours || 0), 0);
  const avgWorkingHours = recordsList.length > 0 ? (totalHoursWorked / recordsList.length).toFixed(1) : "0.0";

  const handleStatusChange = (emp: any, newStatus: string) => {
    markSingle.mutate({
      employeeId: emp.employeeId,
      employeeType: emp.type,
      date: selectedDate,
      shift: emp.shift,
      status: newStatus as any,
    });
  };

  const handleTimeChange = (emp: any, checkInTime: string, checkOutTime: string, overtimeHours: number) => {
    const existing = recordMap.get(emp.employeeId);
    markSingle.mutate({
      employeeId: emp.employeeId,
      employeeType: emp.type,
      date: selectedDate,
      shift: emp.shift,
      status: existing?.status || "Present",
      checkInTime,
      checkOutTime,
      overtimeHours,
    });
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bulkRecords = filteredEmployees.map((emp) => ({
      employeeId: emp.employeeId,
      employeeType: emp.type as "Staff" | "Doctor",
      status: bulkStatus as any,
      shift: bulkShift as any,
      checkInTime: bulkStatus === "Present" ? "09:00 AM" : "-",
      checkOutTime: bulkStatus === "Present" ? "05:00 PM" : "-",
      workingHours: bulkStatus === "Present" ? 8 : 0,
      overtimeHours: 0,
    }));

    await markBulk.mutateAsync({ date: selectedDate, records: bulkRecords });
    setIsBulkOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Present":
        return <Badge tone="success">Present</Badge>;
      case "Half Day":
        return <Badge tone="warning">Half Day</Badge>;
      case "Absent":
        return <Badge tone="danger">Absent</Badge>;
      case "Paid Leave":
      case "Sick Leave":
      case "Casual Leave":
      case "Earned Leave":
      case "Maternity Leave":
      case "Paternity Leave":
      case "Emergency Leave":
        return <Badge tone="info">{status}</Badge>;
      case "Unpaid Leave (LOP)":
        return <Badge tone="danger">Unpaid Leave (LOP)</Badge>;
      case "Weekly Off":
      case "Holiday":
        return <Badge tone="neutral">{status}</Badge>;
      case "Training":
      case "Official Duty":
        return <Badge tone="info">{status}</Badge>;
      default:
        return <Badge tone="neutral">{status || "Not Marked"}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Attendance Administration</h1>
          <p className="text-sm text-slate-500">
            Real-time daily attendance marking, automatic login check-ins, shift tracking, and monthly summaries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Zap className="h-3.5 w-3.5" /> Socket.IO Real-time Sync Active
          </span>
          <Button onClick={() => setIsBulkOpen(true)} className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" /> Bulk Attendance
          </Button>
        </div>
      </div>

      {/* Dashboard KPI Grid (8 Functional Interactive Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Present"
          value={todayPresent}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          onClick={() => toggleKpiFilter("present")}
          className={`cursor-pointer transition-all ${
            activeKpiFilter === "present"
              ? "ring-2 ring-emerald-500 bg-emerald-50/50 shadow-md"
              : "hover:shadow-md hover:border-emerald-300"
          }`}
        />
        <KpiCard
          label="Today's Absent"
          value={todayAbsent}
          icon={<XCircle className="h-5 w-5 text-rose-600" />}
          onClick={() => toggleKpiFilter("absent")}
          className={`cursor-pointer transition-all ${
            activeKpiFilter === "absent"
              ? "ring-2 ring-rose-500 bg-rose-50/50 shadow-md"
              : "hover:shadow-md hover:border-rose-300"
          }`}
        />
        <KpiCard
          label="Employees on Leave"
          value={todayOnLeave}
          icon={<Clock className="h-5 w-5 text-sky-600" />}
          onClick={() => toggleKpiFilter("leave")}
          className={`cursor-pointer transition-all ${
            activeKpiFilter === "leave"
              ? "ring-2 ring-sky-500 bg-sky-50/50 shadow-md"
              : "hover:shadow-md hover:border-sky-300"
          }`}
        />
        <KpiCard
          label="Half Day Staff"
          value={todayHalfDay}
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          onClick={() => toggleKpiFilter("halfDay")}
          className={`cursor-pointer transition-all ${
            activeKpiFilter === "halfDay"
              ? "ring-2 ring-amber-500 bg-amber-50/50 shadow-md"
              : "hover:shadow-md hover:border-amber-300"
          }`}
        />
        <KpiCard
          label="Late Arrivals Today"
          value={todayLate}
          icon={<Clock className="h-5 w-5 text-rose-600" />}
          onClick={() => toggleKpiFilter("late")}
          className={`cursor-pointer transition-all ${
            activeKpiFilter === "late"
              ? "ring-2 ring-rose-500 bg-rose-50/50 shadow-md"
              : "hover:shadow-md hover:border-rose-300"
          }`}
        />
        <KpiCard
          label="Overtime Employees"
          value={todayOvertime}
          icon={<TrendingUp className="h-5 w-5 text-indigo-600" />}
          onClick={() => toggleKpiFilter("overtime")}
          className={`cursor-pointer transition-all ${
            activeKpiFilter === "overtime"
              ? "ring-2 ring-indigo-500 bg-indigo-50/50 shadow-md"
              : "hover:shadow-md hover:border-indigo-300"
          }`}
        />
        <KpiCard
          label="Avg Working Hours"
          value={`${avgWorkingHours} hrs`}
          icon={<Activity className="h-5 w-5 text-navy-600" />}
          onClick={() => toggleKpiFilter("all")}
          className="cursor-pointer hover:shadow-md"
        />
        <KpiCard
          label="Total Registered Staff"
          value={allEmployees.length}
          icon={<Users className="h-5 w-5 text-slate-600" />}
          onClick={() => toggleKpiFilter("all")}
          className={`cursor-pointer transition-all ${
            activeKpiFilter === "all"
              ? "ring-2 ring-navy-500 bg-slate-100/50"
              : "hover:shadow-md"
          }`}
        />
      </div>

      {/* Active KPI Filter Banner */}
      {activeKpiFilter !== "all" && (
        <div className="p-3 bg-navy-50 border border-navy-200 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-navy-900 text-xs font-semibold">
            <Filter className="h-4 w-4 text-navy-600" />
            <span>Active KPI Card Filter:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-navy-600 text-white font-bold text-[11px] uppercase tracking-wider">
              {activeKpiFilter === "present" && "Today's Present"}
              {activeKpiFilter === "absent" && "Today's Absent"}
              {activeKpiFilter === "leave" && "Employees on Leave"}
              {activeKpiFilter === "halfDay" && "Half Day Staff"}
              {activeKpiFilter === "late" && "Late Arrivals Today"}
              {activeKpiFilter === "overtime" && "Overtime Employees"}
            </span>
            <span className="text-slate-500 font-medium">({filteredEmployees.length} staff member(s))</span>
          </div>
          <button
            onClick={() => toggleKpiFilter("all")}
            className="text-xs font-semibold text-navy-700 hover:text-navy-900 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <X className="h-3.5 w-3.5" /> Clear Filter
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center justify-between">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab("daily")}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === "daily" ? "border-navy-600 text-navy-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Daily Attendance Marking
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === "monthly" ? "border-navy-600 text-navy-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Monthly Attendance View
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
              activeTab === "history" ? "border-navy-600 text-navy-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Attendance History Log
          </button>
        </div>
      </div>

      {/* Controls / Filter Section */}
      <Card className="p-4 bg-slate-50 border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {activeTab === "daily" && (
            <InputField
              label="Attendance Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          )}

          {activeTab === "monthly" && (
            <InputField
              label="Select Month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          )}

          <SelectField
            label="Department"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {deptsRes?.map((dept: any) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">All Applicable Roles</option>
            <option value="Doctor">Doctor (Regular)</option>
            <option value="Nurse">Nurse</option>
            <option value="Receptionist">Receptionist</option>
            <option value="Pharmacist">Pharmacist</option>
            <option value="Laboratory Technician">Laboratory Technician</option>
            <option value="Radiology Technician">Radiology Technician</option>
            <option value="Accountant">Accountant</option>
            <option value="Admin Staff">Admin Staff</option>
          </SelectField>

          <SelectField
            label="Shift"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
          >
            <option value="">All Shifts</option>
            <option value="General">General (09:00 AM - 05:00 PM)</option>
            <option value="Morning">Morning (07:00 AM - 03:00 PM)</option>
            <option value="Evening">Evening (03:00 PM - 11:00 PM)</option>
            <option value="Night">Night (11:00 PM - 07:00 AM)</option>
            <option value="Custom Shift">Custom Shift</option>
          </SelectField>

          {activeTab === "daily" && (
            <SelectField
              label="Status Filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses (15 Options)</option>
              <option value="Present">Present</option>
              <option value="Half Day">Half Day</option>
              <option value="Absent">Absent</option>
              <option value="Paid Leave">Paid Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Earned Leave">Earned Leave</option>
              <option value="Maternity Leave">Maternity Leave</option>
              <option value="Paternity Leave">Paternity Leave</option>
              <option value="Emergency Leave">Emergency Leave</option>
              <option value="Unpaid Leave (LOP)">Unpaid Leave (LOP)</option>
              <option value="Holiday">Holiday</option>
              <option value="Weekly Off">Weekly Off</option>
              <option value="Training">Training</option>
              <option value="Official Duty">Official Duty</option>
            </SelectField>
          )}

          <div className="flex flex-col justify-end">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* TAB 1: DAILY ATTENDANCE MARKING */}
      {activeTab === "daily" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Employee ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Employee Name</th>
                  <th className="py-3 px-4 whitespace-nowrap">Role</th>
                  <th className="py-3 px-4 whitespace-nowrap">Department</th>
                  <th className="py-3 px-4 whitespace-nowrap">Shift</th>
                  <th className="py-3 px-4 whitespace-nowrap">Check In</th>
                  <th className="py-3 px-4 whitespace-nowrap">Check Out</th>
                  <th className="py-3 px-4 whitespace-nowrap">Working Hours</th>
                  <th className="py-3 px-4 whitespace-nowrap">OT</th>
                  <th className="py-3 px-4 whitespace-nowrap">Attendance Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">Remarks</th>
                  <th className="py-3 px-4 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dailyLoading ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-500">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-500">
                      No staff members match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const record = recordMap.get(emp.employeeId);
                    const currentStatus = record?.status || "Not Marked";

                    return (
                      <tr key={emp.employeeId} className={`hover:bg-slate-50 ${record?.isManuallyCorrected ? "bg-amber-50/40" : ""}`}>
                        <td className="py-3 px-4 font-mono font-semibold text-navy-700">
                          {emp.employeeId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{emp.name}</div>
                          {record?.isManuallyCorrected && (
                            <div
                              className="group relative inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 cursor-help"
                              title={`Corrected by: ${record.correctedBy?.name ?? "Admin"}\nDate: ${record.correctedAt ? new Date(record.correctedAt).toLocaleString("en-IN") : ""}\nReason: ${record.correctionReason ?? ""}`}
                            >
                              <ShieldCheck className="h-2.5 w-2.5" />
                              Manually Corrected
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 font-medium">{emp.role || emp.designation || "Staff"}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">{emp.department}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            {record?.shift || emp.shift || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">{record?.checkInTime || "-"}</td>
                        <td className="py-3 px-4 text-xs font-mono">{record?.checkOutTime || "-"}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-900">
                          {record?.workingHours !== undefined ? `${record.workingHours} hrs` : "-"}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">
                          {record?.overtimeHours || record?.overtimeMinutes ? (
                            <span className="text-indigo-700 font-semibold">
                              {record.overtimeHours || 0}h {record.overtimeMinutes || 0}m
                              {record.overtimeReason ? ` (${record.overtimeReason})` : ""}
                            </span>
                          ) : (
                            <span className="text-slate-400">0h</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={currentStatus}
                            onChange={(e) => handleStatusChange(emp, e.target.value)}
                            className={`text-xs font-semibold px-2 py-1 rounded border focus:outline-none focus:ring-1 ${
                              currentStatus === "Present"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : currentStatus === "Absent" || currentStatus === "Unpaid Leave (LOP)"
                                ? "bg-rose-50 text-rose-700 border-rose-300"
                                : currentStatus === "Half Day"
                                ? "bg-amber-50 text-amber-700 border-amber-300"
                                : "bg-slate-50 text-slate-700 border-slate-300"
                            }`}
                          >
                            <option value="Not Marked">Select Status...</option>
                            <option value="Present">Present</option>
                            <option value="Half Day">Half Day</option>
                            <option value="Absent">Absent</option>
                            <option value="Paid Leave">Paid Leave</option>
                            <option value="Sick Leave">Sick Leave</option>
                            <option value="Casual Leave">Casual Leave</option>
                            <option value="Earned Leave">Earned Leave</option>
                            <option value="Maternity Leave">Maternity Leave</option>
                            <option value="Paternity Leave">Paternity Leave</option>
                            <option value="Emergency Leave">Emergency Leave</option>
                            <option value="Unpaid Leave (LOP)">Unpaid Leave (LOP)</option>
                            <option value="Holiday">Holiday</option>
                            <option value="Weekly Off">Weekly Off</option>
                            <option value="Training">Training</option>
                            <option value="Official Duty">Official Duty</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 max-w-[150px] truncate" title={record?.remarks || ""}>
                          {record?.remarks || "-"}
                        </td>
                        {/* Correct Attendance — Admin Only */}
                        <td className="py-3 px-4">
                          {record ? (
                            <button
                              onClick={() => {
                                setCorrectionRecord(record as AttendanceRecord);
                                setIsCorrectionOpen(true);
                              }}
                              title="Manually edit / correct this attendance record"
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100 transition-colors"
                            >
                              <PencilLine className="h-3 w-3" />
                              Edit
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const newDraft: any = {
                                  hospital: "",
                                  employeeRef: emp._id,
                                  employeeType: emp.type,
                                  employeeId: emp.employeeId,
                                  employeeName: emp.name,
                                  designation: emp.role || emp.designation,
                                  shift: emp.shift || "General",
                                  date: selectedDate,
                                  checkInTime: "09:00 AM",
                                  checkOutTime: "05:00 PM",
                                  workingHours: 8,
                                  overtimeHours: 0,
                                  status: "Present",
                                  isLate: false,
                                  isEarlyExit: false,
                                };
                                setCorrectionRecord(newDraft);
                                setIsCorrectionOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-navy-700 bg-navy-50 border border-navy-300 rounded-md hover:bg-navy-100 transition-colors"
                            >
                              + Mark
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: MONTHLY ATTENDANCE SUMMARY */}
      {activeTab === "monthly" && (
        <Card className="overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">
              Monthly Attendance Summary ({selectedMonth})
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Standard Working Days: 26 | Synced to Accountant Payroll
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Emp ID</th>
                  <th className="py-3 px-3">Employee Name</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-3 text-center">Working Days</th>
                  <th className="py-3 px-3 text-center text-emerald-700">Present</th>
                  <th className="py-3 px-3 text-center text-rose-700">Absent</th>
                  <th className="py-3 px-3 text-center text-amber-700">Half Days</th>
                  <th className="py-3 px-3 text-center text-sky-700">Paid Leave</th>
                  <th className="py-3 px-3 text-center text-red-700 font-bold">LOP Days</th>
                  <th className="py-3 px-3 text-center">Off / Holiday</th>
                  <th className="py-3 px-3 text-center">OT Hours</th>
                  <th className="py-3 px-3 text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monthlyLoading ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-500">
                      Calculating monthly attendance totals...
                    </td>
                  </tr>
                ) : !monthlyData?.summaries || monthlyData.summaries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-500">
                      No monthly summaries available for this period.
                    </td>
                  </tr>
                ) : (
                  monthlyData.summaries.map((summary) => (
                    <tr key={summary.employeeId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-semibold text-navy-700">
                        {summary.employeeId}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {summary.employeeName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{summary.designation}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                        {summary.workingDays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                        {summary.presentDays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                        {summary.absentDays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-600">
                        {summary.halfDays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-sky-600">
                        {summary.paidLeaveDays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-red-600 bg-red-50">
                        {summary.unpaidLeaveDays}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500">
                        {summary.weeklyOffs + summary.holidays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-indigo-700">
                        {summary.overtimeHours} hrs
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            summary.attendancePercentage >= 90
                              ? "bg-emerald-100 text-emerald-800"
                              : summary.attendancePercentage >= 75
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {summary.attendancePercentage}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: ATTENDANCE HISTORY LOG */}
      {activeTab === "history" && (
        <Card className="overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Recent Attendance Audit Logs</h3>
            <span className="text-xs text-slate-500">
              Records with <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-bold uppercase"><ShieldCheck className="h-2.5 w-2.5" /> Manually Corrected</span> have been admin-edited.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Emp ID</th>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Status Marked</th>
                  <th className="py-3 px-4">Marked By</th>
                  <th className="py-3 px-4">Correction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {historyLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Loading history log...
                    </td>
                  </tr>
                ) : !historyData?.data || historyData.data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No recent attendance logs.
                    </td>
                  </tr>
                ) : (
                  historyData.data.map((log: any) => (
                    <tr key={log._id} className={`hover:bg-slate-50 ${log.isManuallyCorrected ? "bg-amber-50/40" : ""}`}>
                      <td className="py-2.5 px-4 font-mono">{log.date}</td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-navy-700">
                        {log.employeeId}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{log.employeeName}</td>
                      <td className="py-2.5 px-4">
                        <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                          log.isManuallyCorrected
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "text-slate-600"
                        }`}>
                          {log.attendanceSource || "Automatic Login"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">{log.shift}</td>
                      <td className="py-2.5 px-4">{getStatusBadge(log.status)}</td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {log.markedBy?.name || "System / Auto"}
                      </td>
                      <td className="py-2.5 px-4">
                        {log.isManuallyCorrected ? (
                          <div
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 cursor-help"
                            title={`Corrected by: ${log.correctedBy?.name ?? "Admin"}\nDate: ${log.correctedAt ? new Date(log.correctedAt).toLocaleString("en-IN") : ""}\nReason: ${log.correctionReason ?? ""}${log.correctionNote ? "\nNote: " + log.correctionNote : ""}`}
                          >
                            <ShieldCheck className="h-2.5 w-2.5" />
                            Corrected
                          </div>
                        ) : (
                          <span className="text-slate-400">Auto</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* BULK ATTENDANCE MODAL */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Bulk Staff Attendance Marking"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            This action will set the selected attendance status for all filtered employees on{" "}
            <span className="font-bold text-navy-700">{selectedDate}</span>.
          </p>

          <SelectField
            label="Attendance Status to Apply"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as any)}
          >
            <option value="Present">Present</option>
            <option value="Half Day">Half Day</option>
            <option value="Absent">Absent</option>
            <option value="Paid Leave">Paid Leave</option>
            <option value="Sick Leave">Sick Leave</option>
            <option value="Casual Leave">Casual Leave</option>
            <option value="Earned Leave">Earned Leave</option>
            <option value="Maternity Leave">Maternity Leave</option>
            <option value="Paternity Leave">Paternity Leave</option>
            <option value="Emergency Leave">Emergency Leave</option>
            <option value="Unpaid Leave (LOP)">Unpaid Leave (LOP)</option>
            <option value="Holiday">Holiday</option>
            <option value="Weekly Off">Weekly Off</option>
            <option value="Training">Training</option>
            <option value="Official Duty">Official Duty</option>
          </SelectField>

          <SelectField
            label="Shift"
            value={bulkShift}
            onChange={(e) => setBulkShift(e.target.value as any)}
          >
            <option value="General">General Shift</option>
            <option value="Morning">Morning Shift</option>
            <option value="Evening">Evening Shift</option>
            <option value="Night">Night Shift</option>
            <option value="Custom Shift">Custom Shift</option>
          </SelectField>

          <div className="p-3 bg-slate-100 rounded-md text-xs text-slate-700 flex items-center justify-between">
            <span>Target Employees Count:</span>
            <span className="font-bold font-mono text-navy-700">{filteredEmployees.length} Staff</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setIsBulkOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Apply Bulk Attendance</Button>
          </div>
        </form>
      </Modal>

      {/* MANUAL ATTENDANCE CORRECTION DIALOG */}
      <AttendanceCorrectionDialog
        isOpen={isCorrectionOpen}
        onClose={() => { setIsCorrectionOpen(false); setCorrectionRecord(null); }}
        record={correctionRecord}
      />
    </div>
  );
}
