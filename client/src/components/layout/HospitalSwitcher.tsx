import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, Globe, Search } from "lucide-react";
import { useHospitals } from "../../features/hospitals";
import { useQueryClient } from "@tanstack/react-query";
import { Hospital } from "../../types/domain";

export function HospitalSwitcher() {
  const queryClient = useQueryClient();
  const { data: hospitalData, isLoading } = useHospitals({ page: 1, limit: 100 });
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hospitals: Hospital[] = hospitalData?.data || [];

  const [activeHospitalId, setActiveHospitalIdState] = useState<string>(() => {
    return (typeof window !== "undefined" && localStorage.getItem("hms_super_admin_active_hospital_id")) || "all";
  });

  // Keep state reactive to cross-component changes
  useEffect(() => {
    const handleContextChange = () => {
      const stored = localStorage.getItem("hms_super_admin_active_hospital_id") || "all";
      setActiveHospitalIdState(stored);
    };
    window.addEventListener("hospital_context_change", handleContextChange);
    return () => window.removeEventListener("hospital_context_change", handleContextChange);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const activeHospital = hospitals.find((h) => h._id === activeHospitalId) || null;

  const handleSelect = (id: string, hospital?: Hospital) => {
    setActiveHospitalIdState(id);
    localStorage.setItem("hms_super_admin_active_hospital_id", id);

    if (id === "all" || !hospital) {
      const defaultName = hospitals[0]?.name || "Preethi Fertility Centre & Women's Clinic";
      localStorage.setItem("hms_hospital_name", defaultName);
      if (hospitals[0]?.logoUrl) {
        localStorage.setItem("hms_hospital_logo", hospitals[0].logoUrl);
      }
    } else {
      localStorage.setItem("hms_hospital_name", hospital.name);
      if (hospital.logoUrl) {
        localStorage.setItem("hms_hospital_logo", hospital.logoUrl);
      }
      queryClient.setQueryData(["hospitals", "me"], hospital);
      queryClient.setQueryData(["hospitals", hospital._id], hospital);
    }

    window.dispatchEvent(new Event("hospital_context_change"));
    window.dispatchEvent(new Event("storage"));

    // Invalidate queries so Super Admin views reload for the selected hospital context
    queryClient.invalidateQueries({ queryKey: ["hospitals"] });
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    queryClient.invalidateQueries({ queryKey: ["departments"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });

    setIsOpen(false);
    setSearch("");
  };

  const getActiveLabel = () => {
    if (activeHospitalId === "all" || !activeHospital) {
      return "All Hospitals";
    }
    return activeHospital.name;
  };

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      (h.code && h.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative inline-block text-left font-sans" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 text-xs text-white transition-colors cursor-pointer focus:outline-none"
        title="Switch Hospital View"
      >
        <Building2 className="h-3.5 w-3.5 text-emerald-200 shrink-0" />
        <span className="font-medium text-white truncate max-w-[140px] sm:max-w-[170px]">
          {getActiveLabel()}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-emerald-200/80 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 sm:w-72 rounded-lg border border-slate-200 bg-white shadow-lg py-1 z-50 divide-y divide-slate-100 text-slate-800">
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Hospital
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {hospitals.length} registered
            </span>
          </div>

          {/* Quick Search if more than 3 hospitals */}
          {hospitals.length > 3 && (
            <div className="p-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search hospitals..."
                  className="w-full pl-8 pr-2 py-1 text-xs rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>
          )}

          <div className="py-1 max-h-60 overflow-y-auto">
            {/* Option 1: All Hospitals */}
            <button
              type="button"
              onClick={() => handleSelect("all")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                activeHospitalId === "all"
                  ? "bg-emerald-50 text-emerald-900 font-semibold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Globe className="h-4 w-4 text-emerald-700 shrink-0" />
                <div className="flex flex-col truncate">
                  <span className="truncate">All Hospitals</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Network-wide overview
                  </span>
                </div>
              </div>
              {activeHospitalId === "all" && <Check className="h-4 w-4 text-emerald-700 shrink-0 ml-2" />}
            </button>

            {/* Option 2: Individual Hospitals */}
            {filteredHospitals.map((h) => {
              const isSelected = activeHospitalId === h._id;
              return (
                <button
                  key={h._id}
                  type="button"
                  onClick={() => handleSelect(h._id, h)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-900 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                    <div className="flex flex-col truncate">
                      <span className="truncate">{h.name}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {h.code || "HOSP"} • {h.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-emerald-700 shrink-0 ml-2" />}
                </button>
              );
            })}

            {filteredHospitals.length === 0 && !isLoading && (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                No hospitals found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
