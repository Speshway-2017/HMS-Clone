import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useBranchContext } from "../../context/BranchContext";
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
    <div className="space-y-6 pb-12">
      {/* 1. Header with Hospital Identity & Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {hospital?.logoUrl ? (
            <img src={hospital.logoUrl} alt={hospital.name} className="h-12 w-12 rounded-xl object-contain ring-2 ring-slate-100 bg-white p-1" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold text-xl ring-2 ring-slate-100 shadow-sm">
              {hospital?.name ? hospital.name.charAt(0).toUpperCase() : "H"}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{hospital?.name || "Hospital Dashboard"}</h1>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-navy-100 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-emerald-700" /> Executive Analytics ERP
              </span>
            </div>
            <p className="text-sm text-slate-500">Real-time enterprise analytics center for hospital operations & finance.</p>
          </div>
        </div>

        {/* Header Action Shortcuts */}
        {!isAllBranches && (
          <div className="flex items-center gap-2">
            <Link
              to="/admin/doctors/new"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800"
            >
              <Plus className="h-3.5 w-3.5" /> Add Doctor
            </Link>
          </div>
        )}
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

      {/* 3. Dynamic KPI Summary Cards Grid with Filter Synchronization */}
      <div key={`kpi-${dateRange}-${selectedDepartment}-${selectedDoctor}`} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 transition-all duration-300 ease-in-out">
        <KpiCard
          label={dateRange === "today" ? "Today's Appointments" : "Appointments"}
          value={filteredAppointments.length}
          icon={<CalendarClock className="h-5 w-5" />}
          emphasis
          to="/admin/appointments"
        />
        <KpiCard
          label="Bed Occupancy"
          value={`${counts?.bedOccupancyPercent ?? 0}%`}
          icon={<BedDouble className="h-5 w-5" />}
          trend={{ direction: "up", text: `${counts?.occupiedBeds ?? 0}/${counts?.totalBeds ?? 0} beds` }}
          to="/admin/departments"
        />
        <KpiCard
          label="Total Revenue (Paid)"
          value={`₹${displayRevenue.toFixed(2)}`}
          icon={<Wallet className="h-5 w-5" />}
          to="/admin/finance"
        />
        <KpiCard
          label="Critical Stock Alerts"
          value={counts?.criticalStockCount ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          to="/admin/inventory"
        />
      </div>

      {/* Preserved Secondary KPI Grid & Quick Actions */}
      <div key={`sec-kpi-${dateRange}-${selectedDepartment}-${selectedDoctor}`} className="grid grid-cols-1 gap-4 sm:grid-cols-3 transition-all duration-300 ease-in-out">
        <KpiCard label="Doctors" value={filteredDoctorsListArray.length} icon={<Stethoscope className="h-5 w-5" />} to="/admin/doctors" />
        <KpiCard label="Patients" value={filteredPatientsList.length} icon={<Users2 className="h-5 w-5" />} to="/admin/patients" />

        <Card className="flex items-center justify-between p-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Actions</h4>
            <p className="text-xs font-semibold text-slate-700 mt-1">Management Shortcuts</p>
          </div>
          {!isAllBranches ? (
            <Link to="/admin/doctors/new" className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
              <Plus className="h-3.5 w-3.5" /> Doctor
            </Link>
          ) : (
            <span className="text-xs font-semibold text-slate-400 italic">Read-Only View</span>
          )}
        </Card>
      </div>

      {/* 4. Analytics Section Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 pt-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "overview"
              ? "border-emerald-700 text-emerald-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BarChart3 className="h-4 w-4" /> All Analytics Overview
        </button>

        <button
          onClick={() => setActiveTab("patient_flow")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "patient_flow"
              ? "border-emerald-700 text-emerald-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="h-4 w-4" /> Patient & Flow Analytics
        </button>

        <button
          onClick={() => setActiveTab("dept_doctors")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "dept_doctors"
              ? "border-emerald-700 text-emerald-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FolderTree className="h-4 w-4" /> Department & Doctor Analytics
        </button>

        <button
          onClick={() => setActiveTab("revenue")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "revenue"
              ? "border-emerald-700 text-emerald-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Wallet className="h-4 w-4" /> Revenue & Financial Analytics
        </button>

        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "diagnostics"
              ? "border-emerald-700 text-emerald-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FlaskConical className="h-4 w-4" /> Diagnostics, Pharmacy & Beds
        </button>
      </div>

      {/* 5. TAB 1: OVERVIEW (Unified Multi-Section ERP View with Smooth Transitions) */}
      <div key={`sections-${dateRange}-${selectedDepartment}-${selectedDoctor}`} className="transition-all duration-300 ease-in-out">
        {(activeTab === "overview" || activeTab === "patient_flow") && (
          <div className="space-y-8">
            <PatientAnalyticsSection patients={filteredPatientsList} admissions={filteredAdmissions} appointments={filteredAppointments} isLoading={loadingPatients} />
            <OpIpAnalyticsSection patients={filteredPatientsList} appointments={filteredAppointments} admissions={filteredAdmissions} />
            <PatientFlowSection appointments={filteredAppointments} labRequests={labRequestsList} admissions={filteredAdmissions} patients={filteredPatientsList} />
          </div>
        )}

        {(activeTab === "overview" || activeTab === "dept_doctors") && (
          <div className="space-y-8 pt-4">
            <DoctorAnalyticsSection doctors={filteredDoctorsListArray} appointments={filteredAppointments} />
            <DepartmentAnalyticsSection departments={departmentsListArray} invoices={filteredInvoices} appointments={filteredAppointments} />
            <AppointmentAnalyticsSection appointments={filteredAppointments} />
          </div>
        )}

        {(activeTab === "overview" || activeTab === "revenue") && (
          <div className="space-y-8 pt-4">
            <RevenueAnalyticsSection invoices={filteredInvoices} hospitalCounts={{ ...counts, totalRevenue: displayRevenue }} />
          </div>
        )}

        {(activeTab === "overview" || activeTab === "diagnostics") && (
          <div className="space-y-8 pt-4">
            <LabRadiologyPharmacySection labRequests={labRequestsList} inventory={inventoryList} />
            <BedStaffEmergencySection beds={bedsList} staff={staffList} admissions={filteredAdmissions} hospitalCounts={counts} />
          </div>
        )}
      </div>

      {/* 6. Live Activity Stream */}
      <div className="pt-4">
        <LiveActivityPanel />
      </div>
    </div>
  );
}
