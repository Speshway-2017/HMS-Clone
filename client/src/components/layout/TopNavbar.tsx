import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, X, Settings, ChevronDown, ChevronRight, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMyHospital } from "../../features/hospitals";
import { HospitalSwitcher } from "./HospitalSwitcher";
import { NAV_GROUPS_BY_ROLE, NavGroupItem } from "../../config/nav";
import { ROLE_LABEL } from "../../types/auth";

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

export function TopNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: hospital } = useMyHospital();

  // Instant local memory/storage cache to eliminate stale fallback or refresh flicker
  const [persistedHospital, setPersistedHospital] = useState<{ name: string; logoUrl: string }>(() => ({
    name: typeof window !== "undefined" ? localStorage.getItem("hms_hospital_name") || "" : "",
    logoUrl: typeof window !== "undefined" ? localStorage.getItem("hms_hospital_logo") || "" : "",
  }));

  useEffect(() => {
    if (hospital?.name) {
      localStorage.setItem("hms_hospital_name", hospital.name);
      if (hospital.logoUrl) {
        localStorage.setItem("hms_hospital_logo", hospital.logoUrl);
      }
      setPersistedHospital({
        name: hospital.name,
        logoUrl: hospital.logoUrl || "",
      });
    }
  }, [hospital?.name, hospital?.logoUrl]);

  // Keep state reactive to localStorage updates from mutations or sockets in other components
  useEffect(() => {
    const handleStorageChange = () => {
      const name = localStorage.getItem("hms_hospital_name") || "";
      const logoUrl = localStorage.getItem("hms_hospital_logo") || "";
      if (name) {
        setPersistedHospital((prev) => (prev.name !== name || prev.logoUrl !== logoUrl ? { name, logoUrl } : prev));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpandedGroups, setMobileExpandedGroups] = useState<Record<string, boolean>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close dropdown and mobile menu on route change
  useEffect(() => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const navGroups: NavGroupItem[] = NAV_GROUPS_BY_ROLE[user.role] || [];
  const displayName = (user?.name && user.name.trim()) ? user.name.trim() : (user?.email ? user.email.split("@")[0] : "User");
  const userInitials = getAvatarInitials(displayName);
  const roleName = ROLE_LABEL[user.role] || "Portal";

  const getSettingsPath = () => {
    switch (user.role) {
      case "super_admin":
        return "/super-admin/settings";
      case "hospital_admin":
      case "admin":
        return "/admin/settings";
      case "receptionist":
        return "/receptionist/settings";
      case "doctor":
        return "/doctor/settings";
      case "pharmacist":
        return "/pharmacy/settings";
      case "staff":
      case "nurse":
        return "/staff/settings";
      case "patient":
        return "/patient/settings";
      default:
        return "/settings";
    }
  };

  const isExactOrChildActive = (path: string) => {
    if (path === "/super-admin" || path === "/admin" || path === "/doctor" || path === "/receptionist" || path === "/pharmacy" || path === "/staff" || path === "/patient") {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isGroupActive = (item: NavGroupItem) => {
    if (item.type === "link") {
      return isExactOrChildActive(item.path);
    }
    return item.items.some((sub) => isExactOrChildActive(sub.path));
  };

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActiveDropdown(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const toggleMobileGroup = (label: string) => {
    setMobileExpandedGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <header className="sticky top-0 z-50 shadow-sm print:hidden font-sans">
      {/* ── Tier 1: Top Bar (Deep Botanical Green Clinical Header) ───────────── */}
      <div className="bg-[#0b3322] border-b border-[#082418] text-white">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-[72px] items-center justify-between gap-4">
            
            {/* Left: Clinic Brand Identity */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded text-emerald-200 hover:text-white hover:bg-emerald-900/60 transition-colors cursor-pointer"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <Link to="/" className="flex items-center gap-3 group shrink-0">
                <div className="relative">
                  <img
                    src={hospital?.logoUrl || persistedHospital.logoUrl || "/preethi_logo.jpg"}
                    alt={hospital?.name || persistedHospital.name || "Preethi Fertility Centre"}
                    className="h-11 w-11 sm:h-12 sm:w-12 rounded-full object-contain border border-emerald-400/50 bg-white p-1 shadow-md group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/preethi_logo.jpg";
                    }}
                  />
                </div>
                
                <div className="flex flex-col min-w-0 justify-center">
                  <span className="font-bold text-base sm:text-lg text-white tracking-tight leading-snug group-hover:text-emerald-200 transition-colors truncate">
                    {hospital?.name || persistedHospital.name || "Preethi Fertility Centre & Women's Clinic"}
                  </span>
                  <span className="text-xs font-medium text-emerald-200/90 tracking-wide hidden sm:inline leading-none mt-0.5">
                    Hospital Information System
                  </span>
                </div>
              </Link>

              {/* Top Bar Role Badge */}
              <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-medium bg-white/10 text-emerald-100 border border-white/10 ml-2">
                {roleName}
              </span>
            </div>

            {/* Right: Top Bar Utilities & User Info */}
            <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
              {/* Hospital Switcher (ONLY Super Admin has access to switch between hospitals and network data) */}
              {user?.role === "super_admin" && (
                <div className="hidden lg:block">
                  <HospitalSwitcher />
                </div>
              )}

              {/* Settings Shortcut */}
              <button
                onClick={() => navigate(getSettingsPath())}
                className="p-2 rounded text-emerald-200 hover:text-white hover:bg-emerald-900/60 transition-colors cursor-pointer"
                title="Account Settings"
              >
                <Settings className="h-4 w-4" />
              </button>

              {/* User Profile Capsule */}
              <div className="flex items-center gap-2.5 pl-3 border-l border-emerald-800/80">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-bold border border-emerald-400/50 shadow-sm">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span>{userInitials}</span>
                  )}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs sm:text-sm font-semibold text-white leading-tight max-w-[140px] truncate">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-emerald-300 font-medium leading-none mt-0.5">
                    {roleName}
                  </span>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={() => logout()}
                aria-label="Sign out"
                title="Sign Out"
                className="p-2 rounded text-emerald-200 hover:text-rose-300 hover:bg-emerald-900/60 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tier 2: Top Navigation Bar (Clean White Menu Ribbon) ─────────────── */}
      <div className="hidden lg:block bg-white border-b border-slate-200 shadow-xs" ref={navContainerRef}>
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-1 py-0" aria-label="Main Navigation">
            {navGroups.map((group) => {
              const active = isGroupActive(group);

              if (group.type === "link") {
                const Icon = group.icon;
                return (
                  <Link
                    key={group.path}
                    to={group.path}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs transition-colors cursor-pointer border-b-2 font-medium ${
                      active
                        ? "border-emerald-600 text-emerald-800 font-bold bg-emerald-50/50"
                        : "border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? "text-emerald-700" : "text-slate-500"}`} />
                    <span>{group.label}</span>
                  </Link>
                );
              }

              // Classic Dropdown Menu Item
              const isOpen = activeDropdown === group.label;
              const DropdownIcon = group.icon;

              return (
                <div
                  key={group.label}
                  className="relative"
                  onMouseEnter={() => handleMouseEnter(group.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(isOpen ? null : group.label)}
                    aria-expanded={isOpen}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs transition-colors cursor-pointer border-b-2 font-medium ${
                      active
                        ? "border-emerald-600 text-emerald-800 font-bold bg-emerald-50/50"
                        : isOpen
                        ? "border-slate-300 text-slate-900 bg-slate-50"
                        : "border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-50"
                    }`}
                  >
                    <DropdownIcon className={`h-3.5 w-3.5 ${active ? "text-emerald-700" : "text-slate-500"}`} />
                    <span>{group.label}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${
                      isOpen ? "rotate-180 text-emerald-700" : "text-slate-400"
                    }`} />
                  </button>

                  {/* Classic Dropdown Menu (Flush with Menu Bar) */}
                  {isOpen && (
                    <div
                      className="absolute left-0 top-full mt-0 w-52 rounded-b-md rounded-tr-md bg-white border border-slate-200 shadow-md py-1 z-50 divide-y divide-slate-100"
                      onMouseEnter={() => handleMouseEnter(group.label)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="py-0.5">
                        {group.items.map((sub) => {
                          const subActive = isExactOrChildActive(sub.path);
                          const SubIcon = sub.icon;
                          return (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              onClick={() => setActiveDropdown(null)}
                              className={`flex items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                                subActive
                                  ? "bg-emerald-50 text-emerald-900 font-bold border-l-2 border-emerald-600"
                                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <SubIcon className={`h-3.5 w-3.5 ${subActive ? "text-emerald-700" : "text-slate-500"}`} />
                                <span>{sub.label}</span>
                              </div>
                              {subActive && <Check className="h-3 w-3 text-emerald-700" />}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Mobile Drawer Navigation ────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2.5 pb-5 shadow-lg max-h-[calc(100vh-60px)] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {roleName} Menu
            </span>
            {user?.role === "super_admin" && (
              <div className="sm:hidden">
                <HospitalSwitcher />
              </div>
            )}
          </div>

          <nav className="space-y-1">
            {navGroups.map((group) => {
              const active = isGroupActive(group);

              if (group.type === "link") {
                const Icon = group.icon;
                return (
                  <Link
                    key={group.path}
                    to={group.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                      active
                        ? "bg-emerald-50 text-emerald-800 font-bold border-l-2 border-emerald-600"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                      <span>{group.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  </Link>
                );
              }

              // Mobile Group Item
              const isExpanded = mobileExpandedGroups[group.label] ?? active;
              const DropdownIcon = group.icon;

              return (
                <div key={group.label} className="rounded border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleMobileGroup(group.label)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-emerald-50/70 text-emerald-900 font-bold"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <DropdownIcon className={`h-4 w-4 shrink-0 ${active ? "text-emerald-700" : "text-slate-500"}`} />
                      <span>{group.label}</span>
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {isExpanded && (
                    <div className="py-1 bg-white border-t border-slate-100">
                      {group.items.map((sub) => {
                        const subActive = isExactOrChildActive(sub.path);
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center justify-between px-3.5 py-1.5 text-xs transition-colors ${
                              subActive
                                ? "bg-emerald-50 text-emerald-800 font-bold border-l-2 border-emerald-600"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <SubIcon className={`h-3.5 w-3.5 shrink-0 ${subActive ? "text-emerald-700" : "text-slate-400"}`} />
                              <span>{sub.label}</span>
                            </div>
                            {subActive && <Check className="h-3 w-3 text-emerald-700" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
