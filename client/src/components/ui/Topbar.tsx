import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMyHospital } from "../../features/hospitals";
import { NotificationPanel } from "./NotificationPanel";
import { BranchSwitcher } from "../layout/BranchSwitcher";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function getAvatarInitials(name?: string): string {
  if (!name || !name.trim()) return "U";
  const cleanName = name.replace(/^Dr\.\s*|^Dr\s+/i, "").trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const { data: hospital } = useMyHospital({ enabled: !!user?.hospital });

  // Always display user's Full Name (or fallback to email prefix if name is missing)
  const displayName = (user?.name && user.name.trim()) ? user.name.trim() : (user?.email ? user.email.split("@")[0] : "User");
  const userInitials = getAvatarInitials(displayName);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3 sm:px-4 md:px-6 sticky top-0 z-40">
      {/* Left side spacing - Mobile Menu Button and Logo */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:bg-slate-100 transition-colors md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Mobile-only hospital branding */}
        <div className="flex items-center gap-2 md:hidden min-w-0">
          {hospital?.logoUrl ? (
            <img src={hospital.logoUrl || "/hospital-logo.svg"} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain bg-slate-50 p-0.5 border" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/hospital-logo.svg"; }} />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-navy-700 font-bold text-sm">
              {hospital?.name ? hospital.name.charAt(0).toUpperCase() : "H"}
            </div>
          )}
          <span className="text-sm font-bold text-slate-800 max-w-[110px] xs:max-w-[150px] sm:max-w-[220px] truncate">
            {hospital?.name || "HMS"}
          </span>
        </div>
      </div>

      {/* Master Top-Right Header */}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {/* Branch Context Switcher (Shown on desktop/tablet) */}
        <div className="hidden md:block">
          <BranchSwitcher />
        </div>

        {/* 1. Notification Bell */}
        <NotificationPanel />

        {/* 2. Circular User Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-extrabold text-navy-800">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span>{userInitials}</span>
          )}
        </div>

        {/* 3. Logged-in User Name */}
        <span className="hidden sm:inline-block text-sm font-semibold text-slate-700 max-w-[140px] truncate">
          {displayName}
        </span>

        {/* 4. Logout Icon */}
        <button
          onClick={() => logout()}
          aria-label="Log out"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:bg-slate-200 transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
