import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NAV_BY_ROLE } from "../../config/nav";
import { ROLE_LABEL } from "../../types/auth";
import { useMyHospital } from "../../features/hospitals";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const { data: hospital } = useMyHospital({ enabled: !!user?.hospital });

  if (!user) return null;

  const items = NAV_BY_ROLE[user.role];

  return (
    <>
      {/* Backdrop overlay for mobile screens when drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="shrink-0 h-16 px-6 border-b border-slate-200 flex items-center gap-3">
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
            const currentFullPath = location.pathname + location.search;
            const isActive = item.path.includes("?")
              ? currentFullPath === item.path
              : item.label === "Dashboard"
              ? (location.pathname === item.path && (!location.search || location.search === "?tab=overview" || location.search === "?tab=dashboard"))
              : location.pathname === item.path || location.pathname.startsWith(item.path + "/");

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
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
      </aside>
    </>
  );
}
