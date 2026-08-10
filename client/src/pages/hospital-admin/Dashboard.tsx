import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import { useNotifications } from "../../features/notifications";
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
  const { data: notificationsData } = useNotifications();
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
      "notification:new",
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

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Hospital Identity & Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {hospital?.logoUrl ? (
            <img src={hospital.logoUrl} alt={hospital.name} className="h-12 w-12 rounded-xl object-contain ring-2 ring-slate-100 bg-white p-1" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-100 text-navy-700 font-bold text-xl ring-2 ring-slate-100 shadow-sm">
              {hospital?.name ? hospital.name.charAt(0).toUpperCase() : "H"}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{hospital?.name || "Hospital Dashboard"}</h1>
              <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-bold text-navy-700 border border-navy-100 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-navy-700" /> Executive Analytics ERP
              </span>
            </div>
            <p className="text-sm text-slate-500">Real-time enterprise analytics center for hospital operations & finance.</p>
          </div>
        </div>

        {/* Header Action Shortcuts */}
        <div className="flex items-center gap-2">
          <Link
            to="/admin/doctors/new"
            className="flex items-center gap-1.5 rounded-lg bg-navy-700 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-navy-800"
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

      {/* 3. Preserved KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Today's Appointments" value={counts?.todaysAppointments ?? 0} icon={<CalendarClock className="h-5 w-5" />} emphasis to="/admin/appointments" />
        <KpiCard label="Bed Occupancy" value={`${counts?.bedOccupancyPercent ?? 0}%`} icon={<BedDouble className="h-5 w-5" />} trend={{ direction: "up", text: `${counts?.occupiedBeds ?? 0}/${counts?.totalBeds ?? 0} beds` }} to="/admin/departments" />
        <KpiCard label="Total Revenue (Paid)" value={`₹${(counts?.totalRevenue ?? 0).toFixed(2)}`} icon={<Wallet className="h-5 w-5" />} to="/admin/finance" />
        <KpiCard label="Critical Stock Alerts" value={counts?.criticalStockCount ?? 0} icon={<AlertTriangle className="h-5 w-5" />} to="/admin/inventory" />
      </div>

      {/* Preserved Secondary KPI Grid & Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Doctors" value={counts?.totalDoctors ?? 0} icon={<Stethoscope className="h-5 w-5" />} to="/admin/doctors" />
        <KpiCard label="Patients" value={counts?.totalPatients ?? 0} icon={<Users2 className="h-5 w-5" />} to="/admin/patients" />

        <Card className="flex items-center justify-between p-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Actions</h4>
            <p className="text-xs font-semibold text-slate-700 mt-1">Management Shortcuts</p>
          </div>
          <Link to="/admin/doctors/new" className="flex items-center gap-1.5 rounded-lg bg-navy-50 px-2.5 py-1.5 text-xs font-bold text-navy-700 hover:bg-navy-100">
            <Plus className="h-3.5 w-3.5" /> Doctor
          </Link>
        </Card>
      </div>

      {/* 4. Analytics Section Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 pt-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "overview"
              ? "border-navy-700 text-navy-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BarChart3 className="h-4 w-4" /> All Analytics Overview
        </button>

        <button
          onClick={() => setActiveTab("patient_flow")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "patient_flow"
              ? "border-navy-700 text-navy-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="h-4 w-4" /> Patient & Flow Analytics
        </button>

        <button
          onClick={() => setActiveTab("dept_doctors")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "dept_doctors"
              ? "border-navy-700 text-navy-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FolderTree className="h-4 w-4" /> Department & Doctor Analytics
        </button>

        <button
          onClick={() => setActiveTab("revenue")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "revenue"
              ? "border-navy-700 text-navy-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Wallet className="h-4 w-4" /> Revenue & Financial Analytics
        </button>

        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "diagnostics"
              ? "border-navy-700 text-navy-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FlaskConical className="h-4 w-4" /> Diagnostics, Pharmacy & Beds
        </button>
      </div>

      {/* 5. TAB 1: OVERVIEW (Unified Multi-Section ERP View) */}
      {(activeTab === "overview" || activeTab === "patient_flow") && (
        <div className="space-y-8">
          <PatientAnalyticsSection patients={patientsList} admissions={admissionsList} appointments={appointmentsList} isLoading={loadingPatients} />
          <OpIpAnalyticsSection patients={patientsList} appointments={appointmentsList} admissions={admissionsList} />
          <PatientFlowSection appointments={appointmentsList} labRequests={labRequestsList} admissions={admissionsList} patients={patientsList} />
        </div>
      )}

      {(activeTab === "overview" || activeTab === "dept_doctors") && (
        <div className="space-y-8 pt-4">
          <DoctorAnalyticsSection doctors={doctorsListArray} appointments={appointmentsList} />
          <DepartmentAnalyticsSection departments={departmentsListArray} invoices={invoicesList} appointments={appointmentsList} />
          <AppointmentAnalyticsSection appointments={appointmentsList} />
        </div>
      )}

      {(activeTab === "overview" || activeTab === "revenue") && (
        <div className="space-y-8 pt-4">
          <RevenueAnalyticsSection invoices={invoicesList} hospitalCounts={counts} />
        </div>
      )}

      {(activeTab === "overview" || activeTab === "diagnostics") && (
        <div className="space-y-8 pt-4">
          <LabRadiologyPharmacySection labRequests={labRequestsList} inventory={inventoryList} />
          <BedStaffEmergencySection beds={bedsList} staff={staffList} admissions={admissionsList} hospitalCounts={counts} />
        </div>
      )}

      {/* 6. Live Activity Stream & Real-time Notification Panel */}
      <div className="pt-4">
        <LiveActivityPanel notifications={notificationsData?.data?.notifications || []} />
      </div>
    </div>
  );
}
