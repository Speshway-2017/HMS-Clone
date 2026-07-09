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
import { AnalyticsPage } from "./pages/super-admin/AnalyticsPage";
import { ReportsPage } from "./pages/super-admin/ReportsPage";
import { HospitalAdminDashboard } from "./pages/hospital-admin/Dashboard";
import { AccountantDashboard } from "./pages/accountant/Dashboard";

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
          { path: "analytics", element: <AnalyticsPage /> },
          { path: "reports", element: <ReportsPage /> },
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
        children: [{ index: true, element: <HospitalAdminDashboard /> }],
      },
    ],
  },
  {
    element: <ProtectedRoute allow={["accountant"]} />,
    children: [
      {
        path: "/accountant",
        element: <DashboardLayout />,
        children: [{ index: true, element: <AccountantDashboard /> }],
      },
    ],
  },
]);
