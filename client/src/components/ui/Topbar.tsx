import { LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NotificationPanel } from "./NotificationPanel";

export function Topbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    
    // Nurse Dashboard paths
    if (path === "/nurse") return "";
    if (path.startsWith("/nurse/inpatients")) return "Inpatient Care Roster";
    if (path.startsWith("/nurse/handover")) return "Shift Handoff Management";
    if (path.startsWith("/nurse/settings")) return "Account Settings";
    
    // Doctor paths
    if (path === "/doctor") return "Doctor Console";
    if (path.startsWith("/doctor/inpatients")) return "Inpatients Directory";
    if (path.startsWith("/doctor/appointments")) return "Appointments Schedule";
    if (path.startsWith("/doctor/settings")) return "Doctor Settings";
    
    // Admin / Hospital Admin paths
    if (path === "/admin") return "Admin Command Center";
    if (path.startsWith("/admin/dashboard")) return "System Dashboard";
    
    return "Hospital Care Portal";
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return "";
    return role.replace("_", " ").toUpperCase();
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-md px-6 sticky top-0 z-40 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
      
      {/* Left Side: Page Context Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-tight transition-all duration-200">
          {getPageTitle()}
        </h2>
      </div>

      {/* Right Side: Alerts & User Profile */}
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        {(user?.role === "hospital_admin" || 
          user?.role === "doctor" || 
          user?.role === "receptionist" ||
          user?.role === "accountant" || 
          user?.role === "pharmacist" ||
          user?.role === "laboratory" ||
          user?.role === "nurse") && <NotificationPanel />}

        <span className="h-5 w-px bg-slate-200" />

        {/* User Card */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-700 leading-none">{user?.name}</p>
            <p className="text-[9px] font-bold text-navy-600 uppercase tracking-wide bg-navy-50 border border-navy-100/50 px-1.5 py-0.5 rounded mt-1 inline-block">
              {getRoleLabel(user?.role)}
            </p>
          </div>

          <div className="relative shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-navy-100 border border-white"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-sm font-extrabold text-navy-700">
                {user?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>

          <button
            onClick={() => logout()}
            aria-label="Log out"
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
