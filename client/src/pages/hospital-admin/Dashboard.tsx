import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useBranchContext } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";
import { 
  CalendarClock, 
  BedDouble, 
  Wallet, 
  Stethoscope, 
  Users2, 
  AlertTriangle, 
  Plus, 
  BarChart3, 
  Users, 
  Activity, 
  FolderTree, 
  FlaskConical, 
  Zap,
  Sparkles,
  FileText,
  UserPlus,
  ShieldCheck
} from "lucide-react";

import { useHospitalAnalytics } from "../../features/analytics";
import { useMyHospital } from "../../features/hospitals";
import { usePatients } from "../../features/patients";
import { useAppointments } from "../../features/appointments";
import { useInvoices } from "../../features/invoices";
import { useDoctors } from "../../features/doctors";
import { useStaffList } from "../../features/staff";
import { useDepartments } from "../../features/departments";
import { useBeds } from "../../features/beds";
import { useInventory } from "../../features/inventory";
import { useLaboratoryRequests } from "../../features/laboratory";
// Notifications decommissioned per system architecture specification
import { useIPAdmissions } from "../../features/ipBilling";
import { useAdmissions } from "../../features/receptionist";

import { KpiCard } from "../../components/ui/KpiCard";
import { Card } from "../../components/ui/Card";
import { socket } from "../../lib/socket";

import { DashboardHeaderFilterBar, DateRangeOption } from "../../components/admin-dashboard/DashboardHeaderFilterBar";
import { PatientAnalyticsSection } from "../../components/admin-dashboard/PatientAnalyticsSection";
import { OpIpAnalyticsSection } from "../../components/admin-dashboard/OpIpAnalyticsSection";
import { PatientFlowSection } from "../../components/admin-dashboard/PatientFlowSection";
import { DoctorAnalyticsSection } from "../../components/admin-dashboard/DoctorAnalyticsSection";
import { DepartmentAnalyticsSection } from "../../components/admin-dashboard/DepartmentAnalyticsSection";
import { AppointmentAnalyticsSection } from "../../components/admin-dashboard/AppointmentAnalyticsSection";
import { RevenueAnalyticsSection } from "../../components/admin-dashboard/RevenueAnalyticsSection";
import { LabRadiologyPharmacySection } from "../../components/admin-dashboard/LabRadiologyPharmacySection";
import { BedStaffEmergencySection } from "../../components/admin-dashboard/BedStaffEmergencySection";
import { LiveActivityPanel } from "../../components/admin-dashboard/LiveActivityPanel";

type ActiveTabOption = "overview" | "patient_flow" | "dept_doctors" | "revenue" | "diagnostics";

export function HospitalAdminDashboard() {
  const { user } = useAuth();
  const { isAllBranches } = useBranchContext();
  const queryClient = useQueryClient();

  // Filter States
  const [dateRange, setDateRange] = useState<DateRangeOption>("30d");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [activeTab, setActiveTab] = useState<ActiveTabOption>("overview");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live React Query Feeds
  const { data: analyticsData } = useHospitalAnalytics();
  const { data: hospital } = useMyHospital();
  const { data: patientsData, isLoading: loadingPatients } = usePatients({ limit: 1000 });
  const { data: appointmentsData } = useAppointments({ limit: 1000 });
  const { data: invoicesData } = useInvoices({ limit: 1000 });
  const { data: doctorsData } = useDoctors({ limit: 1000 });
  const { data: staffResponse } = useStaffList({});
  const { data: departmentsData } = useDepartments();
  const { data: bedsData } = useBeds();
  const { data: inventoryData } = useInventory();
  const { data: labRequestsData } = useLaboratoryRequests();
  const { data: ipAdmissionsData } = useIPAdmissions();
  const { data: recAdmissionsData } = useAdmissions();

  const counts = analyticsData?.counts;

  // Real-time socket sync invalidation
  const handleSocketSync = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["analytics", "hospital"] });
    queryClient.invalidateQueries({ queryKey: ["patients"] });
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["doctors"] });
    queryClient.invalidateQueries({ queryKey: ["departments"] });
    queryClient.invalidateQueries({ queryKey: ["beds"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["laboratory", "requests"] });
    queryClient.invalidateQueries({ queryKey: ["ip-billing", "admissions"] });
    queryClient.invalidateQueries({ queryKey: ["reception", "admissions"] });
    setLastUpdated(new Date());
  }, [queryClient]);

  useEffect(() => {
    const socketEvents = [
      "dashboard_update",
      "patient_update",
      "appointment_update",
      "payment_update",
      "ip_billing_update",
      "ip_bill_update",
      "prescription:dispensed",
      "prescription:new",
      "admission:request:created",
    ];

    socketEvents.forEach((evt) => socket.on(evt, handleSocketSync));
    return () => {
      socketEvents.forEach((evt) => socket.off(evt, handleSocketSync));
    };
  }, [handleSocketSync]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    handleSocketSync();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Safe array extractions
  const doctorsListArray = Array.isArray(doctorsData) ? doctorsData : ((doctorsData as any)?.data || []);
  const departmentsListArray = Array.isArray(departmentsData) ? departmentsData : ((departmentsData as any)?.data || []);
  const patientsList = Array.isArray(patientsData) ? patientsData : ((patientsData as any)?.data || []);
  const appointmentsList = Array.isArray(appointmentsData) ? appointmentsData : ((appointmentsData as any)?.data || []);
  const invoicesList = Array.isArray(invoicesData) ? invoicesData : ((invoicesData as any)?.data || []);
  const staffList = Array.isArray(staffResponse) ? staffResponse : ((staffResponse as any)?.data || []);
  const bedsList = Array.isArray(bedsData) ? bedsData : ((bedsData as any)?.data || []);
  const inventoryList = Array.isArray(inventoryData) ? inventoryData : ((inventoryData as any)?.data || []);
  const labRequestsList = Array.isArray(labRequestsData) ? labRequestsData : ((labRequestsData as any)?.data || []);

  const ipList = Array.isArray(ipAdmissionsData) ? ipAdmissionsData : [];
  const recList = Array.isArray(recAdmissionsData) ? recAdmissionsData : [];
  const admissionsList = [...ipList, ...recList];

  const departmentsList = departmentsListArray.map((d: any) => ({
    id: d._id || d.name,
    name: d.name,
  }));

  const doctorsList = doctorsListArray.map((doc: any) => ({
    id: doc._id,
    name: doc.name,
  }));

  // --- FILTERING & RECALCULATING DATA BASED ON GLOBAL CONTROLS ---
  const getDateObj = (val: any) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const getFilterBounds = () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (dateRange === "today") {
      // Today bounds
    } else if (dateRange === "yesterday") {
      start.setDate(start.getDate() - 1);
      const endYest = new Date(start);
      endYest.setHours(23, 59, 59, 999);
      return { start, end: endYest };
    } else if (dateRange === "7d") {
      start.setDate(start.getDate() - 7);
    } else if (dateRange === "30d") {
      start.setDate(start.getDate() - 30);
    } else if (dateRange === "3m" || (dateRange as string) === "90d") {
      start.setDate(start.getDate() - 90);
    } else if (dateRange === "6m" || (dateRange as string) === "180d") {
      start.setDate(start.getDate() - 180);
    } else if (dateRange === "1y") {
      start.setDate(start.getDate() - 365);
    }
    return { start, end };
  };

  const { start: filterStart, end: filterEnd } = getFilterBounds();

  const isInRange = (val: any) => {
    if (!val) return true;
    const d = getDateObj(val);
    if (!d) return true;
    return d >= filterStart && d <= filterEnd;
  };

  // Helper to check if item belongs to selected department
  const matchesDepartment = (itemDept: any, itemDocDept?: any) => {
    if (selectedDepartment === "all" || !selectedDepartment) return true;

    const sel = selectedDepartment.toLowerCase().trim();

    if (itemDept) {
      if (typeof itemDept === "object") {
        const id = String(itemDept._id || itemDept.id || "").toLowerCase().trim();
        const name = String(itemDept.name || "").toLowerCase().trim();
        if (id === sel || name === sel || name.includes(sel) || sel.includes(name)) return true;
      } else {
        const str = String(itemDept).toLowerCase().trim();
        if (str === sel || str.includes(sel) || sel.includes(str)) return true;
      }
    }

    if (itemDocDept) {
      if (typeof itemDocDept === "object") {
        const id = String(itemDocDept._id || itemDocDept.id || "").toLowerCase().trim();
        const name = String(itemDocDept.name || "").toLowerCase().trim();
        if (id === sel || name === sel || name.includes(sel) || sel.includes(name)) return true;
      } else {
        const str = String(itemDocDept).toLowerCase().trim();
        if (str === sel || str.includes(sel) || sel.includes(str)) return true;
      }
    }

    return false;
  };

  // Helper to check if item belongs to selected doctor
  const matchesDoctor = (itemDoc: any) => {
    if (selectedDoctor === "all" || !selectedDoctor) return true;

    const sel = selectedDoctor.toLowerCase().trim();
    if (!itemDoc) return false;

    if (typeof itemDoc === "object") {
      const id = String(itemDoc._id || itemDoc.id || "").toLowerCase().trim();
      const name = String(itemDoc.name || "").toLowerCase().trim();
      const cleanDocName = name.replace(/^dr\.\s*/i, "").trim();
      const cleanSel = sel.replace(/^dr\.\s*/i, "").trim();
      if (id === sel || name === sel || cleanDocName === cleanSel || name.includes(cleanSel) || cleanSel.includes(name)) return true;
    } else {
      const str = String(itemDoc).toLowerCase().trim();
      const cleanDocName = str.replace(/^dr\.\s*/i, "").trim();
      const cleanSel = sel.replace(/^dr\.\s*/i, "").trim();
      if (str === sel || cleanDocName === cleanSel || str.includes(cleanSel) || cleanSel.includes(str)) return true;
    }

    return false;
  };

  // Helper to calculate appointment OPD fee
  const getAppointmentFee = (app: any) => {
    const rawFee = app.paidAmount || app.totalAmount || app.amount || app.fee || app.consultationFee;
    if (rawFee !== undefined && rawFee !== null && rawFee !== "") {
      const num = parseFloat(String(rawFee).replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
    if (app.doctor && typeof app.doctor === "object") {
      const docFee = (app.doctor.consultationSettings as any)?.fee || app.doctor.consultationFee || app.doctor.fee;
      if (docFee) {
        const num = parseFloat(String(docFee).replace(/[^0-9.]/g, ""));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    if (app.department && typeof app.department === "object" && app.department.consultationFee) {
      const num = parseFloat(String(app.department.consultationFee).replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
    return 500;
  };

  // 1. Filtered Appointments
  const filteredAppointments = appointmentsList.filter((app: any) => {
    const appDate = app.appointmentDate || app.date || app.createdAt;
    if (!isInRange(appDate)) return false;

    const appDept = app.department || app.departmentId;
    const appDocDept = app.doctor?.department || app.doctorId?.department;
    if (!matchesDepartment(appDept, appDocDept)) return false;

    const appDoc = app.doctor || app.doctorId;
    if (!matchesDoctor(appDoc)) return false;

    return true;
  });

  // 2. Filtered Invoices
  const filteredInvoices = invoicesList.filter((inv: any) => {
    const invDate = inv.issueDate || inv.createdAt || inv.date;
    if (!isInRange(invDate)) return false;

    const invDept = inv.department || inv.appointment?.department;
    const invDocDept = inv.doctor?.department || inv.appointment?.doctor?.department;
    if (!matchesDepartment(invDept, invDocDept)) return false;

    const invDoc = inv.doctor || inv.doctorId || inv.appointment?.doctor;
    if (!matchesDoctor(invDoc)) return false;

    return true;
  });

  // 3. Filtered Admissions
  const filteredAdmissions = admissionsList.filter((adm: any) => {
    const admDate = adm.admissionDate || adm.createdAt;
    if (!isInRange(admDate)) return false;

    const admDept = adm.department || adm.doctor?.department;
    if (!matchesDepartment(admDept)) return false;

    const admDoc = adm.doctor || adm.doctorId;
    if (!matchesDoctor(admDoc)) return false;

    return true;
  });

  // 4. Filtered Doctors
  const filteredDoctorsListArray = doctorsListArray.filter((doc: any) => {
    const docDept = doc.department;
    if (!matchesDepartment(docDept)) return false;
    if (!matchesDoctor(doc)) return false;
    return true;
  });

  // 5. Filtered Patients
  const filteredPatientsList = patientsList.filter((pat: any) => {
    const patDate = pat.createdAt || pat.registrationDate;
    if (dateRange !== "30d" && dateRange !== "1y" && !isInRange(patDate)) {
      const hasApp = filteredAppointments.some((a: any) => {
        const patId = typeof a.patient === "object" ? a.patient?._id : a.patient;
        return patId === pat._id || patId === pat.id;
      });
      if (!hasApp && !isInRange(patDate)) return false;
    }
    return true;
  });

  // 6. Dynamic Total Revenue Calculation (Invoices + Appointments OPD + IP Admissions)
  const invoiceRevenue = filteredInvoices.reduce((sum: number, inv: any) => {
    const status = (inv.status || "").toLowerCase();
    if (status === "paid" || status === "partially_paid" || inv.paidAmount > 0 || inv.totalAmount) {
      const amt = parseFloat(inv.paidAmount || inv.totalAmount || inv.amount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }
    return sum;
  }, 0);

  const appointmentOpdRevenue = filteredAppointments.reduce((sum: number, app: any) => {
    const status = (app.status || "").toLowerCase();
    if (status !== "cancelled") {
      return sum + getAppointmentFee(app);
    }
    return sum;
  }, 0);

  const admissionIpRevenue = filteredAdmissions.reduce((sum: number, adm: any) => {
    const amt = parseFloat(adm.paidAmount || adm.totalAmount || adm.advanceAmount || adm.depositAmount || 0);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const calculatedFilteredRevenue = Math.max(invoiceRevenue, appointmentOpdRevenue + admissionIpRevenue);

  const displayRevenue = (selectedDepartment !== "all" || selectedDoctor !== "all" || dateRange !== "30d")
    ? (calculatedFilteredRevenue > 0 ? calculatedFilteredRevenue : appointmentOpdRevenue)
    : (counts?.totalRevenue && counts.totalRevenue > 0 ? counts.totalRevenue : (calculatedFilteredRevenue || appointmentOpdRevenue));

  return (
    <div className="space-y-5 pb-12 font-sans">
      {/* 1. Header with Hospital Identity & Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <img
              src={hospital?.logoUrl || "/preethi_logo.jpg"}
              alt={hospital?.name || "Preethi Fertility Centre"}
              className="h-11 w-11 rounded-xl object-contain bg-white p-1 border border-emerald-400/40 shadow-xs"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/preethi_logo.jpg";
              }}
            />
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {hospital?.name || "Preethi Fertility Centre & Women's Clinic"}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Hospital Admin Console
              </span>
              {user?.employeeId && (
                <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 border border-sky-200">
                  <span className="text-slate-500 font-normal">Admin ID:</span>
                  <span className="font-mono font-bold text-sky-900">{user.employeeId}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Clinical operations, patient volume, and billing telemetry.
              {user?.name && (
                <span className="ml-1 text-slate-400 hidden sm:inline">
                  • Logged in as <strong className="text-slate-700 font-medium">{user.name}</strong>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Header Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/appointments"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
          >
            <CalendarClock className="h-3.5 w-3.5 text-emerald-700" /> Appointments
          </Link>
          <Link
            to="/admin/staff/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5 text-slate-500" /> Add Staff
          </Link>
          <Link
            to="/admin/doctors/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Doctor
          </Link>
        </div>
      </div>

      {/* 2. Global Filter & Socket Controls Bar */}
      <DashboardHeaderFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedDepartment={selectedDepartment}
        onDepartmentChange={setSelectedDepartment}
        selectedDoctor={selectedDoctor}
        onDoctorChange={setSelectedDoctor}
        departments={departmentsList}
        doctors={doctorsList}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
      />

      {/* 3. Sleek Executive Pulse Summary Strip (Replaces massive KPI card clutter with clean analytics focus) */}
      <div
        key={`kpi-${dateRange}-${selectedDepartment}-${selectedDoctor}`}
        className="flex items-center gap-3 overflow-x-auto rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-2xs text-xs"
      >
        <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] shrink-0 flex items-center gap-1.5 border-r border-slate-200 pr-3">
          <Activity className="h-3.5 w-3.5 text-emerald-700" />
          <span>Hospital Pulse</span>
        </span>

        <div className="flex items-center gap-4 shrink-0 text-slate-600">
          <Link to="/admin/appointments" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
            <span className="text-slate-400">Appointments:</span>
            <strong className="text-slate-900 font-bold">{filteredAppointments.length}</strong>
          </Link>
          <span className="text-slate-200">•</span>
          <Link to="/admin/beds" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
            <span className="text-slate-400">Bed Occupancy:</span>
            <strong className="text-slate-900 font-bold">{counts?.bedOccupancyPercent ?? 0}%</strong>
            <span className="text-[10px] text-slate-400 font-normal">({counts?.occupiedBeds ?? 0}/{counts?.totalBeds ?? 0})</span>
          </Link>
          <span className="text-slate-200">•</span>
          <Link to="/admin/finance" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
            <span className="text-slate-400">Collections:</span>
            <strong className="text-emerald-700 font-bold">₹{displayRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
          </Link>
          <span className="text-slate-200">•</span>
          <Link to="/admin/doctors" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
            <span className="text-slate-400">Doctors:</span>
            <strong className="text-slate-900 font-bold">{filteredDoctorsListArray.length} Active</strong>
          </Link>
          <span className="text-slate-200">•</span>
          <Link to="/admin/patients" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
            <span className="text-slate-400">Registered Patients:</span>
            <strong className="text-slate-900 font-bold">{filteredPatientsList.length}</strong>
          </Link>
          <span className="text-slate-200">•</span>
          <Link to="/admin/inventory" className="hover:text-emerald-700 transition-colors flex items-center gap-1.5">
            <span className="text-slate-400">Stock Alerts:</span>
            <strong className={`${(counts?.criticalStockCount ?? 0) > 0 ? "text-amber-600" : "text-emerald-700"} font-bold`}>
              {counts?.criticalStockCount ?? 0}
            </strong>
          </Link>
        </div>
      </div>

      {/* 4. Analytics Section Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1 pt-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "overview"
              ? "border-emerald-600 text-emerald-800 font-bold bg-emerald-50/40"
              : "border-transparent text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Operational Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("patient_flow")}
          className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "patient_flow"
              ? "border-emerald-600 text-emerald-800 font-bold bg-emerald-50/40"
              : "border-transparent text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Users className="h-3.5 w-3.5 text-emerald-600" />
          <span>Patient & Clinical Flow</span>
        </button>

        <button
          onClick={() => setActiveTab("dept_doctors")}
          className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "dept_doctors"
              ? "border-emerald-600 text-emerald-800 font-bold bg-emerald-50/40"
              : "border-transparent text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <FolderTree className="h-3.5 w-3.5 text-emerald-600" />
          <span>Departments & Doctors</span>
        </button>

        <button
          onClick={() => setActiveTab("revenue")}
          className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "revenue"
              ? "border-emerald-600 text-emerald-800 font-bold bg-emerald-50/40"
              : "border-transparent text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Wallet className="h-3.5 w-3.5 text-emerald-600" />
          <span>Revenue & Billing</span>
        </button>

        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "diagnostics"
              ? "border-emerald-600 text-emerald-800 font-bold bg-emerald-50/40"
              : "border-transparent text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5 text-emerald-600" />
          <span>Diagnostics & Facilities</span>
        </button>
      </div>

      {/* 5. TAB VIEWS: Restructured Domain Sections */}
      <div key={`sections-${dateRange}-${selectedDepartment}-${selectedDoctor}`} className="transition-all duration-200">
        {/* OVERVIEW TAB: Core Hospital Pulse */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <AppointmentAnalyticsSection appointments={filteredAppointments} />
            <PatientFlowSection appointments={filteredAppointments} labRequests={labRequestsList} admissions={filteredAdmissions} patients={filteredPatientsList} />
            <RevenueAnalyticsSection invoices={filteredInvoices} hospitalCounts={{ ...counts, totalRevenue: displayRevenue }} />
            <BedStaffEmergencySection beds={bedsList} staff={staffList} admissions={filteredAdmissions} hospitalCounts={counts} />
            <LiveActivityPanel />
          </div>
        )}

        {/* PATIENT & FLOW TAB */}
        {activeTab === "patient_flow" && (
          <div className="space-y-6">
            <PatientAnalyticsSection patients={filteredPatientsList} admissions={filteredAdmissions} appointments={filteredAppointments} isLoading={loadingPatients} />
            <OpIpAnalyticsSection patients={filteredPatientsList} appointments={filteredAppointments} admissions={filteredAdmissions} />
            <PatientFlowSection appointments={filteredAppointments} labRequests={labRequestsList} admissions={filteredAdmissions} patients={filteredPatientsList} />
          </div>
        )}

        {/* DEPARTMENTS & DOCTORS TAB */}
        {activeTab === "dept_doctors" && (
          <div className="space-y-6">
            <DoctorAnalyticsSection doctors={filteredDoctorsListArray} appointments={filteredAppointments} />
            <DepartmentAnalyticsSection departments={departmentsListArray} invoices={filteredInvoices} appointments={filteredAppointments} />
          </div>
        )}

        {/* REVENUE & BILLING TAB */}
        {activeTab === "revenue" && (
          <div className="space-y-6">
            <RevenueAnalyticsSection invoices={filteredInvoices} hospitalCounts={{ ...counts, totalRevenue: displayRevenue }} />
          </div>
        )}

        {/* DIAGNOSTICS & FACILITIES TAB */}
        {activeTab === "diagnostics" && (
          <div className="space-y-6">
            <LabRadiologyPharmacySection labRequests={labRequestsList} inventory={inventoryList} />
            <BedStaffEmergencySection beds={bedsList} staff={staffList} admissions={filteredAdmissions} hospitalCounts={counts} />
          </div>
        )}
      </div>
    </div>
  );
}
