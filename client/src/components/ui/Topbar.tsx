import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMyHospital } from "../../features/hospitals";
import { NotificationPanel } from "./NotificationPanel";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const { data: hospital } = useMyHospital({ enabled: !!user?.hospital });

  // Master display name based on logged-in user or role (e.g., 'receptionist', 'doctor', 'nurse', 'admin')
  const displayName = user?.name || (user as any)?.username || user?.role || "user";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 md:px-6 sticky top-0 z-40">
      {/* Left side spacing - Mobile Menu Button and Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:bg-slate-100 transition-colors md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Mobile-only hospital branding */}
        <div className="flex items-center gap-2 md:hidden">
          {hospital?.logoUrl ? (
            <img src={hospital.logoUrl} alt={hospital.name} className="h-8 w-8 rounded-lg object-contain bg-slate-50 p-0.5 border" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-navy-700 font-bold text-sm">
              {hospital?.name ? hospital.name.charAt(0).toUpperCase() : "H"}
            </div>
          )}
          <span className="text-sm font-bold text-slate-800 max-w-[120px] truncate">
            {hospital?.name || "HMS"}
          </span>
        </div>
      </div>

      {/* Master Top-Right Header (Receptionist Reference Standard) */}
      <div className="flex items-center gap-4">
        {/* 1. Notification Bell */}
        <NotificationPanel />

        {/* 2. Circular User Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-extrabold text-navy-800">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span>{userInitial}</span>
          )}
        </div>

        {/* 3. Logged-in User Name */}
        <span className="text-sm font-semibold text-slate-700">
          {displayName}
        </span>

        {/* 4. Logout Icon */}
        <button
          onClick={() => logout()}
          aria-label="Log out"
          className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
