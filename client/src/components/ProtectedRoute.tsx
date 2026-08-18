import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types/auth";
import { isElectron, DESKTOP_ALLOWED_ROLES } from "../utils/electron";
import { tokenStorage } from "../lib/tokenStorage";

export function ProtectedRoute({ allow }: { allow: Role[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (isElectron() && !DESKTOP_ALLOWED_ROLES.includes(user.role)) {
    tokenStorage.clear();
    sessionStorage.setItem(
      "desktop_blocked_message",
      "This account is available only through the patient web portal."
    );
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

