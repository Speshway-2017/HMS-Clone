import { Search, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NotificationPanel } from "./NotificationPanel";

const SETTINGS_PATH: Record<string, string> = {
  super_admin: "/super-admin/settings",
  hospital_admin: "/admin/settings",
  accountant: "/accountant/settings",
  pharmacist: "/pharmacy/settings",
  laboratory: "/laboratory/settings",
  doctor: "/doctor/settings",
};

export function Topbar() {
  const { user } = useAuth();
  const settingsPath = user?.role ? (SETTINGS_PATH[user.role] ?? "/") : "/";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex w-full max-w-md items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell — for hospital_admin, doctor, receptionist, accountant, pharmacist, and laboratory roles */}
        {(user?.role === "hospital_admin" || 
          user?.role === "doctor" || 
          user?.role === "receptionist" ||
          user?.role === "accountant" || 
          user?.role === "pharmacist" ||
          user?.role === "laboratory") && <NotificationPanel />}

        {/* Avatar + name → Settings */}
        <Link
          to={settingsPath}
          aria-label="Go to Settings"
          className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-slate-100"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-200"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-700">
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
          <span className="text-sm font-medium text-slate-700">{user?.name}</span>
          <Settings className="h-3.5 w-3.5 text-slate-400" />
        </Link>
      </div>
    </header>
  );
}
