import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { NotificationPanel } from "./NotificationPanel";

export function Topbar() {
  const { user, logout } = useAuth();

  // Master display name based on logged-in user or role (e.g., 'receptionist', 'doctor', 'nurse', 'admin')
  const displayName = user?.name || (user as any)?.username || user?.role || "user";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 sticky top-0 z-40">
      {/* Left side spacing */}
      <div className="flex items-center gap-3"></div>

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
