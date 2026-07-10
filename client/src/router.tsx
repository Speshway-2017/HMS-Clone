import { createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LandingPage } from "./pages/public/LandingPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
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
import { HospitalAdminDashboard } from "./pages/hospital-admin/Dashboard";
import { DoctorsPage } from "./pages/hospital-admin/DoctorsPage";
import { DoctorFormPage } from "./pages/hospital-admin/DoctorFormPage";
import { DoctorProfilePage } from "./pages/hospital-admin/DoctorProfilePage";
import { DoctorPerformancePage } from "./pages/hospital-admin/DoctorPerformancePage";
import { PatientsPage } from "./pages/hospital-admin/PatientsPage";
import { PatientFormPage } from "./pages/hospital-admin/PatientFormPage";
import { PatientDetailsPage } from "./pages/hospital-admin/PatientDetailsPage";
import { AppointmentsPage } from "./pages/hospital-admin/AppointmentsPage";
import { AppointmentFormPage } from "./pages/hospital-admin/AppointmentFormPage";
import { AppointmentDetailsPage } from "./pages/hospital-admin/AppointmentDetailsPage";
import { StaffPage } from "./pages/hospital-admin/StaffPage";
import { StaffFormPage } from "./pages/hospital-admin/StaffFormPage";
import { FinancePage } from "./pages/hospital-admin/FinancePage";
import { InvoiceFormPage } from "./pages/hospital-admin/InvoiceFormPage";
import { PatientInvoicePage } from "./pages/hospital-admin/PatientInvoicePage";
import { InventoryPage } from "./pages/hospital-admin/InventoryPage";
import { InventoryFormPage } from "./pages/hospital-admin/InventoryFormPage";
import { InventoryItemDetailsPage } from "./pages/hospital-admin/InventoryItemDetailsPage";
import { AccountantDashboard } from "./pages/accountant/Dashboard";
import { SettingsPage } from "./pages/shared/SettingsPage";
import { ReceptionistDashboard } from "./pages/receptionist/Dashboard";
import { PatientManagementPage } from "./pages/receptionist/PatientManagement";
import { AppointmentsPage as ReceptionAppointmentsPage } from "./pages/receptionist/Appointments";
import { OPManagementPage } from "./pages/receptionist/OPManagement";
import { IPManagementPage } from "./pages/receptionist/IPManagement";
import { BillingPage as ReceptionBillingPage } from "./pages/receptionist/Billing";
import { QueuePage } from "./pages/receptionist/Queue";
import { DisplayQueuePage } from "./pages/receptionist/DisplayQueue";
import { DoctorsPage as ReceptionDoctorsPage } from "./pages/receptionist/Doctors";
import { NotificationsPage as ReceptionNotificationsPage } from "./pages/receptionist/Notifications";
import { ReportsPage as ReceptionReportsPage } from "./pages/receptionist/Reports";

// Doctor module
import { DoctorDashboard } from "./pages/doctor/Dashboard";
import { OPManagementPage } from "./pages/doctor/OPManagementPage";
import { IPManagementPage } from "./pages/doctor/IPManagementPage";
import { PatientRecordsPage } from "./pages/doctor/PatientRecordsPage";
import { LaboratoryPage } from "./pages/doctor/LaboratoryPage";
import { RadiologyPage } from "./pages/doctor/RadiologyPage";
import { OperationTheatrePage } from "./pages/doctor/OperationTheatrePage";
import { TelemedicinePage } from "./pages/doctor/TelemedicinePage";
import { PerformancePage } from "./pages/doctor/PerformancePage";
import { DoctorSettingsPage } from "./pages/doctor/SettingsPage";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/login", element: <LoginPage /> },
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
          { path: "patients", element: <PatientsPage /> },
          { path: "patients/new", element: <PatientFormPage /> },
          { path: "patients/:id", element: <PatientDetailsPage /> },
          { path: "patients/:id/edit", element: <PatientFormPage /> },
          { path: "appointments", element: <AppointmentsPage /> },
          { path: "appointments/new", element: <AppointmentFormPage /> },
          { path: "appointments/:id", element: <AppointmentDetailsPage /> },
          { path: "staff", element: <StaffPage /> },
          { path: "staff/new", element: <StaffFormPage /> },
          { path: "staff/:id/edit", element: <StaffFormPage /> },
          { path: "departments", element: <DepartmentsPage /> },
          { path: "departments/new", element: <DepartmentFormPage /> },
          { path: "departments/:id/edit", element: <DepartmentFormPage /> },
          { path: "departments/:id/metrics", element: <DepartmentMetricsPage /> },
          { path: "finance", element: <FinancePage /> },
          { path: "finance/invoices/new", element: <InvoiceFormPage /> },
          { path: "finance/invoices/:id", element: <PatientInvoicePage /> },
          { path: "inventory", element: <InventoryPage /> },
          { path: "inventory/new", element: <InventoryFormPage /> },
          { path: "inventory/:id", element: <InventoryItemDetailsPage /> },
          { path: "inventory/:id/edit", element: <InventoryFormPage /> },
          { path: "roles", element: <ManageRolesPage /> },
          { path: "roles/new", element: <RoleFormPage /> },
          { path: "roles/:id/edit", element: <RoleFormPage /> },
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
          { path: "settings", element: <SettingsPage /> },
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
          { path: "patients/search", element: <PatientManagementPage activeTab="search" /> },
          { path: "patients/:id", element: <PatientManagementPage /> },
          { path: "appointments", element: <ReceptionAppointmentsPage /> },
          { path: "appointments/new", element: <ReceptionAppointmentsPage activeTab="new" /> },
          { path: "appointments/today", element: <ReceptionAppointmentsPage activeTab="today" /> },
          { path: "appointments/calendar", element: <ReceptionAppointmentsPage activeTab="calendar" /> },
          { path: "op", element: <OPManagementPage /> },
          { path: "op/new", element: <OPManagementPage activeTab="new" /> },
          { path: "op/queue", element: <OPManagementPage activeTab="queue" /> },
          { path: "op/history", element: <OPManagementPage activeTab="history" /> },
          { path: "ip", element: <IPManagementPage /> },
          { path: "ip/new", element: <IPManagementPage activeTab="new" /> },
          { path: "ip/admissions", element: <IPManagementPage activeTab="admissions" /> },
          { path: "ip/rooms", element: <IPManagementPage activeTab="rooms" /> },
          { path: "ip/beds", element: <IPManagementPage activeTab="rooms" /> },
          { path: "ip/transfer", element: <IPManagementPage activeTab="transfer" /> },
          { path: "ip/discharges", element: <IPManagementPage activeTab="discharges" /> },
          { path: "billing", element: <ReceptionBillingPage /> },
          { path: "billing/consultation", element: <ReceptionBillingPage activeTab="consultation" /> },
          { path: "billing/new", element: <ReceptionBillingPage activeTab="consultation" /> },
          { path: "billing/payments", element: <ReceptionBillingPage activeTab="pending" /> },
          { path: "billing/pending", element: <ReceptionBillingPage activeTab="pending" /> },
          { path: "billing/completed", element: <ReceptionBillingPage activeTab="completed" /> },
          { path: "billing/receipts", element: <ReceptionBillingPage activeTab="completed" /> },
          { path: "billing/collections", element: <ReceptionBillingPage activeTab="collections" /> },
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
        element: <DisplayQueuePage />
      },
      {
        path: "/display-board",
        element: <DisplayQueuePage />
      }
    element: <ProtectedRoute allow={["doctor"]} />,
    children: [
      {
        path: "/doctor",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DoctorDashboard /> },
          { path: "op-management", element: <OPManagementPage /> },
          { path: "ip-management", element: <IPManagementPage /> },
          { path: "patient-records", element: <PatientRecordsPage /> },
          { path: "laboratory", element: <LaboratoryPage /> },
          { path: "radiology", element: <RadiologyPage /> },
          { path: "ot", element: <OperationTheatrePage /> },
          { path: "telemedicine", element: <TelemedicinePage /> },
          { path: "performance", element: <PerformancePage /> },
          { path: "settings", element: <DoctorSettingsPage /> },
        ],
      },
    ],
  },
]);


