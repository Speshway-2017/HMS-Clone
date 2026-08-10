import { createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LandingPage } from "./pages/public/LandingPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { VerifyPrescriptionPage } from "./pages/public/VerifyPrescriptionPage";
import { PublicDoctorProfilePage } from "./pages/public/PublicDoctorProfilePage";

// Super Admin module
import { SuperAdminDashboard } from "./pages/super-admin/Dashboard";
import { HospitalsPage } from "./pages/super-admin/HospitalsPage";
import { HospitalFormPage } from "./pages/super-admin/HospitalFormPage";
import { HospitalDetailsPage } from "./pages/super-admin/HospitalDetailsPage";
import { BranchesPage } from "./pages/super-admin/BranchesPage";
import { BranchFormPage } from "./pages/super-admin/BranchFormPage";
import { DepartmentsPage } from "./pages/super-admin/DepartmentsPage";
import { DepartmentFormPage } from "./pages/super-admin/DepartmentFormPage";
import { DepartmentMetricsPage } from "./pages/super-admin/DepartmentMetricsPage";
import { AdminsPage } from "./pages/super-admin/AdminsPage";
import { AdminFormPage } from "./pages/super-admin/AdminFormPage";
import { ManageRolesPage } from "./pages/super-admin/ManageRolesPage";
import { RoleFormPage } from "./pages/super-admin/RoleFormPage";
import { AnalyticsPage } from "./pages/super-admin/AnalyticsPage";
import { ReportsPage } from "./pages/super-admin/ReportsPage";

// Hospital Admin module
import { HospitalAdminDashboard } from "./pages/hospital-admin/Dashboard";
import { DoctorsPage } from "./pages/hospital-admin/DoctorsPage";
import { DoctorFormPage } from "./pages/hospital-admin/DoctorFormPage";
import { DoctorProfilePage } from "./pages/hospital-admin/DoctorProfilePage";
import { DoctorPerformancePage } from "./pages/hospital-admin/DoctorPerformancePage";
import { PatientsPage } from "./pages/hospital-admin/PatientsPage";
import { PatientDetailsPage } from "./pages/hospital-admin/PatientDetailsPage";
import { AppointmentsPage } from "./pages/hospital-admin/AppointmentsPage";
import { AppointmentDetailsPage } from "./pages/hospital-admin/AppointmentDetailsPage";
import { FinancePage } from "./pages/hospital-admin/FinancePage";
import { PatientInvoicePage } from "./pages/hospital-admin/PatientInvoicePage";
import { InventoryPage } from "./pages/hospital-admin/InventoryPage";
import { InventoryFormPage } from "./pages/hospital-admin/InventoryFormPage";
import { InventoryItemDetailsPage } from "./pages/hospital-admin/InventoryItemDetailsPage";
import { BedsPage } from "./pages/hospital-admin/BedsPage";
import { HospitalInfoPage } from "./pages/hospital-admin/HospitalInfoPage";
import { EnquiriesPage } from "./pages/hospital-admin/EnquiriesPage";
import { BlogsPage } from "./pages/hospital-admin/BlogsPage";
import { BlogFormPage } from "./pages/hospital-admin/BlogFormPage";
import { StaffPage } from "./pages/hospital-admin/StaffPage";
import { StaffFormPage } from "./pages/hospital-admin/StaffFormPage";
import { StaffDetailsPage } from "./pages/hospital-admin/StaffDetailsPage";
import { StaffAttendancePage } from "./pages/hospital-admin/StaffAttendancePage";
import { ShiftManagementPage } from "./pages/hospital-admin/ShiftManagementPage";
import { LeaveManagementPage } from "./pages/hospital-admin/LeaveManagementPage";

// Accountant module
import { AccountantDashboard } from "./pages/accountant/Dashboard";
import { AccountantBillingPage } from "./pages/accountant/BillingPage";
import { AccountantPaymentsPage } from "./pages/accountant/PaymentsPage";
import { AccountantClaimsPage } from "./pages/accountant/ClaimsPage";
import { AccountantPayrollPage } from "./pages/accountant/PayrollPage";
import { AccountantExpensesPage } from "./pages/accountant/ExpensesPage";
import { AccountantAnalyticsPage } from "./pages/accountant/AnalyticsPage";
import { AccountantAuditLogsPage } from "./pages/accountant/AuditLogsPage";
import { AccountantSettingsPage } from "./pages/accountant/SettingsPage";

// Shared/Profile settings
import { SettingsPage } from "./pages/shared/SettingsPage";

// Receptionist module
import { ReceptionistDashboard } from "./pages/receptionist/Dashboard";
import { PatientManagementPage } from "./pages/receptionist/PatientManagement";
import { AppointmentsPage as ReceptionAppointmentsPage } from "./pages/receptionist/Appointments";
import { OPManagementPage as ReceptionistOPManagementPage } from "./pages/receptionist/OPManagement";
import { IPManagementPage as ReceptionistIPManagementPage } from "./pages/receptionist/IPManagement";
import { BillingPage as ReceptionBillingPage } from "./pages/receptionist/Billing";
import { QueuePage } from "./pages/receptionist/Queue";
import { DisplayQueuePage } from "./pages/receptionist/DisplayQueue";
import { DoctorsPage as ReceptionDoctorsPage } from "./pages/receptionist/Doctors";
import { NotificationsPage as ReceptionNotificationsPage } from "./pages/receptionist/Notifications";
import { ReportsPage as ReceptionReportsPage } from "./pages/receptionist/Reports";

// Doctor module
import { DoctorDashboard } from "./pages/doctor/Dashboard";
import { OPManagementPage as DoctorOPManagementPage } from "./pages/doctor/OPManagementPage";
import { IPManagementPage as DoctorIPManagementPage } from "./pages/doctor/IPManagementPage";
import { PatientRecordsPage } from "./pages/doctor/PatientRecordsPage";
import { LaboratoryPage } from "./pages/doctor/LaboratoryPage";
import { RadiologyPage } from "./pages/doctor/RadiologyPage";
import { OperationTheatrePage } from "./pages/doctor/OperationTheatrePage";
import { TelemedicinePage } from "./pages/doctor/TelemedicinePage";
import { PerformancePage } from "./pages/doctor/PerformancePage";
import { DoctorSettingsPage } from "./pages/doctor/SettingsPage";
import { TodayAppointmentsPage } from "./pages/doctor/TodayAppointmentsPage";
import { QueuePage as DoctorQueuePage } from "./pages/doctor/QueuePage";
import { InpatientsPage as DoctorInpatientsPage } from "./pages/doctor/InpatientsPage";
import { CompletedConsultationsPage } from "./pages/doctor/CompletedConsultationsPage";
import { PendingPrescriptionsPage } from "./pages/doctor/PendingPrescriptionsPage";
import { NewPrescriptionPage } from "./pages/doctor/NewPrescriptionPage";
import { PendingLabOrdersPage } from "./pages/doctor/PendingLabOrdersPage";
import { NewLabOrderPage } from "./pages/doctor/NewLabOrderPage";
import { FollowupsPage } from "./pages/doctor/FollowupsPage";
import { SurgeriesPage } from "./pages/doctor/SurgeriesPage";
import { NotificationsPage as DoctorNotificationsPage } from "./pages/doctor/NotificationsPage";
import { CalendarPage as DoctorCalendarPage } from "./pages/doctor/CalendarPage";
import { PatientsPage as DoctorPatientsPage } from "./pages/doctor/PatientsPage";
import { NewCertificatePage } from "./pages/doctor/NewCertificatePage";
import { ConsultationWorkspacePage } from "./pages/doctor/ConsultationWorkspacePage";

// Pharmacy module
import { PharmacyDashboard } from "./pages/pharmacy/Dashboard";
import { PharmacyPrescriptionVerification } from "./pages/pharmacy/PrescriptionVerification";
import { PharmacyMedicineDispensing } from "./pages/pharmacy/MedicineDispensing";
import { PharmacyInventoryManagement } from "./pages/pharmacy/InventoryManagement";
import { PharmacySupplierManagement } from "./pages/pharmacy/SupplierManagement";
import { PharmacyBilling } from "./pages/pharmacy/Billing";
import { PharmacySalesAnalytics } from "./pages/pharmacy/SalesAnalytics";
import { PharmacySettings } from "./pages/pharmacy/Settings";

// Laboratory module
import { LaboratoryDashboard } from "./pages/laboratory/Dashboard";
import { LaboratoryTestRequestManagement } from "./pages/laboratory/TestRequestManagement";
import { LaboratorySampleCollection } from "./pages/laboratory/SampleCollection";
import { LaboratoryTestProcessing } from "./pages/laboratory/TestProcessing";
import { LaboratoryInventory } from "./pages/laboratory/LabInventory";
import { LaboratoryReportDelivery } from "./pages/laboratory/ReportDelivery";
import { LaboratorySettings } from "./pages/laboratory/Settings";
import { LaboratoryBilling } from "./pages/laboratory/Billing";
import { NewLabBillPage } from "./pages/laboratory/NewLabBill";
import { UploadReportPage } from "./pages/laboratory/UploadReportPage";
import { TestRequestDetailsPage } from "./pages/laboratory/TestRequestDetailsPage";
import { LaboratoryQualityControl } from "./pages/laboratory/QualityControl";

// Nurse & Patient modules
import { NurseDashboardPage } from "./pages/nurse/DashboardPage";
import { AssignedPatientsPage } from "./pages/nurse/AssignedPatientsPage";
import { MedicationAdminPage } from "./pages/nurse/MedicationAdminPage";
import { VitalsMonitoringPage } from "./pages/nurse/VitalsMonitoringPage";
import { NursingNotesPage } from "./pages/nurse/NursingNotesPage";
import { CarePlansPage } from "./pages/nurse/CarePlansPage";
import ShiftHandover from "./pages/nurse/ShiftHandover";
import { WardManagementPage } from "./pages/nurse/WardManagementPage";
import { EmergencyAlertsPage } from "./pages/nurse/EmergencyAlertsPage";
import { AlertDetailPage } from "./pages/nurse/AlertDetailPage";
import NurseNotificationsPage from "./pages/nurse/NotificationsPage";
import { PatientDashboard } from "./pages/patient/Dashboard";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password/:token", element: <ResetPasswordPage /> },
      { path: "/verify-prescription/:id", element: <VerifyPrescriptionPage /> },
      { path: "/doctors/:id", element: <PublicDoctorProfilePage /> },
    ],
  },
  {
    element: <ProtectedRoute allow={["super_admin"]} />,
    children: [
      {
        path: "/super-admin",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <SuperAdminDashboard /> },
          { path: "hospitals", element: <HospitalsPage /> },
          { path: "hospitals/new", element: <HospitalFormPage /> },
          { path: "hospitals/:id", element: <HospitalDetailsPage /> },
          { path: "hospitals/:id/edit", element: <HospitalFormPage /> },
          { path: "branches", element: <BranchesPage /> },
          { path: "branches/new", element: <BranchFormPage /> },
          { path: "branches/:id/edit", element: <BranchFormPage /> },
          { path: "departments", element: <DepartmentsPage /> },
          { path: "departments/new", element: <DepartmentFormPage /> },
          { path: "departments/:id/edit", element: <DepartmentFormPage /> },
          { path: "departments/:id/metrics", element: <DepartmentMetricsPage /> },
          { path: "admins", element: <AdminsPage /> },
          { path: "admins/new", element: <AdminFormPage /> },
          { path: "admins/:id/edit", element: <AdminFormPage /> },
          { path: "roles", element: <ManageRolesPage /> },
          { path: "roles/new", element: <RoleFormPage /> },
          { path: "roles/:id/edit", element: <RoleFormPage /> },
          { path: "analytics", element: <AnalyticsPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allow={["hospital_admin"]} />,
    children: [
      {
        path: "/admin",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <HospitalAdminDashboard /> },
          { path: "doctors", element: <DoctorsPage /> },
          { path: "doctors/new", element: <DoctorFormPage /> },
          { path: "doctors/:id", element: <DoctorProfilePage /> },
          { path: "doctors/:id/edit", element: <DoctorFormPage /> },
          { path: "doctors/:id/performance", element: <DoctorPerformancePage /> },
          { path: "staff", element: <StaffPage /> },
          { path: "staff/new", element: <StaffFormPage /> },
          { path: "staff/attendance", element: <StaffAttendancePage /> },
          { path: "staff/shifts", element: <ShiftManagementPage /> },
          { path: "staff/leaves", element: <LeaveManagementPage /> },
          { path: "staff/:id", element: <StaffDetailsPage /> },
          { path: "staff/:id/edit", element: <StaffFormPage /> },
          { path: "patients", element: <PatientsPage /> },
          { path: "patients/:id", element: <PatientDetailsPage /> },
          { path: "appointments", element: <AppointmentsPage /> },
          { path: "appointments/:id", element: <AppointmentDetailsPage /> },
          { path: "departments", element: <DepartmentsPage /> },
          { path: "departments/new", element: <DepartmentFormPage /> },
          { path: "departments/:id/edit", element: <DepartmentFormPage /> },
          { path: "departments/:id/metrics", element: <DepartmentMetricsPage /> },
          { path: "finance", element: <FinancePage /> },
          { path: "finance/invoices/:id", element: <PatientInvoicePage /> },
          { path: "inventory", element: <InventoryPage /> },
          { path: "inventory/new", element: <InventoryFormPage /> },
          { path: "inventory/:id", element: <InventoryItemDetailsPage /> },
          { path: "inventory/:id/edit", element: <InventoryFormPage /> },
          { path: "roles", element: <ManageRolesPage /> },
          { path: "roles/new", element: <RoleFormPage /> },
          { path: "roles/:id/edit", element: <RoleFormPage /> },
          { path: "beds", element: <BedsPage /> },
          { path: "hospital-info", element: <HospitalInfoPage /> },
          { path: "enquiries", element: <EnquiriesPage /> },
          { path: "blogs", element: <BlogsPage /> },
          { path: "blogs/new", element: <BlogFormPage /> },
          { path: "blogs/edit/:id", element: <BlogFormPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allow={["accountant"]} />,
    children: [
      {
        path: "/accountant",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <AccountantDashboard /> },
          { path: "billing", element: <AccountantBillingPage /> },
          { path: "payments", element: <AccountantPaymentsPage /> },
          { path: "claims", element: <AccountantClaimsPage /> },
          { path: "payroll", element: <AccountantPayrollPage /> },
          { path: "expenses", element: <AccountantExpensesPage /> },
          { path: "analytics", element: <AccountantAnalyticsPage /> },
          { path: "audit-logs", element: <AccountantAuditLogsPage /> },
          { path: "settings", element: <AccountantSettingsPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allow={["receptionist"]} />,
    children: [
      {
        path: "/receptionist",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <ReceptionistDashboard /> },
          { path: "patients", element: <PatientManagementPage /> },
          { path: "patients/new", element: <PatientManagementPage activeTab="new" /> },
          { path: "patients/search", element: <PatientManagementPage activeTab="list" /> },
          { path: "patients/:id", element: <PatientManagementPage /> },
          { path: "appointments", element: <ReceptionAppointmentsPage /> },
          { path: "appointments/new", element: <ReceptionAppointmentsPage activeTab="new" /> },
          { path: "appointments/today", element: <ReceptionAppointmentsPage activeTab="today" /> },
          { path: "appointments/calendar", element: <ReceptionAppointmentsPage activeTab="calendar" /> },
          { path: "op", element: <ReceptionistOPManagementPage /> },
          { path: "op/new", element: <ReceptionistOPManagementPage activeTab="new" /> },
          { path: "op/queue", element: <ReceptionistOPManagementPage activeTab="queue" /> },
          { path: "op/history", element: <ReceptionistOPManagementPage activeTab="history" /> },
          { path: "ip", element: <ReceptionistIPManagementPage /> },
          { path: "ip/new", element: <ReceptionistIPManagementPage activeTab="new" /> },
          { path: "ip/admissions", element: <ReceptionistIPManagementPage activeTab="admissions" /> },
          { path: "ip/rooms", element: <ReceptionistIPManagementPage activeTab="rooms" /> },
          { path: "ip/beds", element: <ReceptionistIPManagementPage activeTab="rooms" /> },
          { path: "ip/transfer", element: <ReceptionistIPManagementPage activeTab="transfer" /> },
          { path: "ip/discharges", element: <ReceptionistIPManagementPage activeTab="discharges" /> },
          { path: "billing", element: <ReceptionBillingPage /> },
          { path: "billing/consultation", element: <ReceptionBillingPage activeTab="consultation" /> },
          { path: "billing/new", element: <ReceptionBillingPage activeTab="consultation" /> },
          { path: "billing/payments", element: <ReceptionBillingPage activeTab="pending" /> },
          { path: "billing/pending", element: <ReceptionBillingPage activeTab="pending" /> },
          { path: "billing/completed", element: <ReceptionBillingPage activeTab="completed" /> },
          { path: "billing/receipts", element: <ReceptionBillingPage activeTab="completed" /> },
          { path: "billing/collections", element: <ReceptionBillingPage activeTab="collections" /> },
          { path: "billing/ip", element: <ReceptionBillingPage activeTab="ip" /> },
          { path: "queue", element: <QueuePage /> },
          { path: "queue/tokens", element: <QueuePage /> },
          { path: "doctors", element: <ReceptionDoctorsPage /> },
          { path: "doctors/availability", element: <ReceptionDoctorsPage activeTab="availability" /> },
          { path: "doctors/timings", element: <ReceptionDoctorsPage activeTab="timings" /> },
          { path: "notifications", element: <ReceptionNotificationsPage /> },
          { path: "reports", element: <ReceptionReportsPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
      {
        path: "/receptionist/queue/display",
        element: <DisplayQueuePage />,
      },
      {
        path: "/display-board",
        element: <DisplayQueuePage />,
      },
    ],
  },
  {
    element: <ProtectedRoute allow={["doctor"]} />,
    children: [
      {
        path: "/doctor",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DoctorDashboard /> },
          { path: "op-management", element: <DoctorOPManagementPage /> },
          { path: "ip-management", element: <DoctorIPManagementPage /> },
          { path: "patient-records", element: <PatientRecordsPage /> },
          { path: "laboratory", element: <LaboratoryPage /> },
          { path: "radiology", element: <RadiologyPage /> },
          { path: "ot", element: <OperationTheatrePage /> },
          { path: "telemedicine", element: <TelemedicinePage /> },
          { path: "performance", element: <PerformancePage /> },
          { path: "settings", element: <DoctorSettingsPage /> },
          { path: "appointments/today", element: <TodayAppointmentsPage /> },
          { path: "queue", element: <DoctorQueuePage /> },
          { path: "inpatients", element: <DoctorInpatientsPage /> },
          { path: "consultations/completed", element: <CompletedConsultationsPage /> },
          { path: "prescriptions/pending", element: <PendingPrescriptionsPage /> },
          { path: "prescriptions/new", element: <NewPrescriptionPage /> },
          { path: "laboratory/pending", element: <PendingLabOrdersPage /> },
          { path: "laboratory/new", element: <NewLabOrderPage /> },
          { path: "followups", element: <FollowupsPage /> },
          { path: "surgeries", element: <SurgeriesPage /> },
          { path: "notifications", element: <DoctorNotificationsPage /> },
          { path: "calendar", element: <DoctorCalendarPage /> },
          { path: "patients", element: <DoctorPatientsPage /> },
          { path: "certificates/new", element: <NewCertificatePage /> },
          { path: "consultation/:id", element: <ConsultationWorkspacePage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allow={["pharmacist"]} />,
    children: [
      {
        path: "/pharmacy",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <PharmacyDashboard /> },
          { path: "prescriptions", element: <PharmacyPrescriptionVerification /> },
          { path: "dispensing", element: <PharmacyMedicineDispensing /> },
          { path: "inventory", element: <PharmacyInventoryManagement /> },
          { path: "suppliers", element: <PharmacySupplierManagement /> },
          { path: "billing", element: <PharmacyBilling /> },
          { path: "analytics", element: <PharmacySalesAnalytics /> },
          { path: "settings", element: <PharmacySettings /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allow={["laboratory"]} />,
    children: [
      {
        path: "/laboratory",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <LaboratoryDashboard /> },
          { path: "requests", element: <LaboratoryTestRequestManagement /> },
          { path: "requests/:requestId", element: <TestRequestDetailsPage /> },
          { path: "samples", element: <LaboratorySampleCollection /> },
          { path: "processing", element: <LaboratoryTestProcessing /> },
          { path: "processing/upload", element: <UploadReportPage /> },
          { path: "qc", element: <LaboratoryQualityControl /> },
          { path: "inventory", element: <LaboratoryInventory /> },
          { path: "reports", element: <LaboratoryReportDelivery /> },
          { path: "billing", element: <LaboratoryBilling /> },
          { path: "billing/new", element: <NewLabBillPage /> },
          { path: "settings", element: <LaboratorySettings /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allow={["nurse"]} />,
    children: [
      {
        path: "/nurse",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <NurseDashboardPage /> },
          { path: "patients", element: <AssignedPatientsPage /> },
          { path: "inpatients", element: <AssignedPatientsPage /> },
          { path: "medications", element: <MedicationAdminPage /> },
          { path: "vitals", element: <VitalsMonitoringPage /> },
          { path: "notes", element: <NursingNotesPage /> },
          { path: "care-plans", element: <CarePlansPage /> },
          { path: "shift-handover", element: <ShiftHandover /> },
          { path: "handover", element: <ShiftHandover /> },
          { path: "wards", element: <WardManagementPage /> },
          { path: "alerts", element: <EmergencyAlertsPage /> },
          { path: "alerts/:id", element: <AlertDetailPage /> },
          { path: "notifications", element: <NurseNotificationsPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allow={["patient"]} />,
    children: [
      {
        path: "/patient",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <PatientDashboard /> },
          { path: "appointments", element: <PatientDashboard activeTab="appointments" /> },
          { path: "profile", element: <PatientDashboard activeTab="profile" /> },
          { path: "history", element: <PatientDashboard activeTab="history" /> },
          { path: "prescriptions", element: <PatientDashboard activeTab="prescriptions" /> },
          { path: "reports", element: <PatientDashboard activeTab="reports" /> },
          { path: "imaging", element: <PatientDashboard activeTab="imaging" /> },
          { path: "billing", element: <PatientDashboard activeTab="billing" /> },
          { path: "insurance", element: <PatientDashboard activeTab="insurance" /> },
          { path: "telehealth", element: <PatientDashboard activeTab="telehealth" /> },
          { path: "notifications", element: <PatientDashboard activeTab="notifications" /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
