import { NavLink, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { NAV_BY_ROLE } from "../../config/nav";
import { ROLE_LABEL } from "../../types/auth";
import { useMyHospital } from "../../features/hospitals";

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { data: hospital } = useMyHospital({ enabled: !!user?.hospital });

  if (!user) return null;

  const items = NAV_BY_ROLE[user.role];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="shrink-0 px-6 py-6 border-b border-slate-100 flex items-center gap-3">
        {hospital?.logoUrl ? (
          <img src={hospital.logoUrl} alt={hospital.name} className="h-10 w-10 rounded-lg object-contain bg-slate-50 p-0.5 border" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-navy-700 font-bold text-lg">
            {hospital?.name ? hospital.name.charAt(0).toUpperCase() : "H"}
          </div>
        )}
        <div className="overflow-hidden">
          <div className="text-sm font-bold text-slate-800 truncate" title={hospital?.name || "HMS Enterprise"}>
            {hospital?.name || "HMS Enterprise"}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{ROLE_LABEL[user.role]}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const isActive =
            item.label === "Dashboard"
              ? location.pathname === item.path
              : location.pathname === item.path || location.pathname.startsWith(item.path + "/");

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-navy-50 text-navy-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-4">
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <div>
            <div className="text-sm font-semibold text-slate-800">{user.name}</div>
            <div className="text-xs text-slate-500">{ROLE_LABEL[user.role]}</div>
          </div>
          <button
            onClick={() => logout()}
            aria-label="Log out"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
