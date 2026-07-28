import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { NotificationPanel } from "./NotificationPanel";

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-slate-200 bg-white px-6">

      <div className="flex items-center gap-3">
        {/* Notification bell — for hospital_admin, doctor, receptionist, accountant, pharmacist, and laboratory roles */}
        {(user?.role === "hospital_admin" || 
          user?.role === "doctor" || 
          user?.role === "receptionist" ||
          user?.role === "accountant" || 
          user?.role === "pharmacist" ||
          user?.role === "laboratory") && <NotificationPanel />}

        {/* Avatar + name → Log Out */}
        <button
          onClick={() => logout()}
          aria-label="Log out"
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
          <LogOut className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
    </header>
  );
}
