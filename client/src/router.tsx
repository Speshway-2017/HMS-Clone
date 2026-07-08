import { createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LandingPage } from "./pages/public/LandingPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SuperAdminDashboard } from "./pages/super-admin/Dashboard";
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
        children: [{ index: true, element: <SuperAdminDashboard /> }],
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
