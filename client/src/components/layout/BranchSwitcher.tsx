import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, GitBranch, Layers } from "lucide-react";
import { useBranchContext } from "../../context/BranchContext";
import { useBranches } from "../../features/branches";
import { useMyHospital } from "../../features/hospitals";
import { Branch } from "../../types/domain";

export function BranchSwitcher() {
  const { activeBranchId, setActiveBranchId, activeBranch } = useBranchContext();
  const { data: hospital } = useMyHospital();
  const { data: branchData } = useBranches({ limit: 100 });
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const branches: Branch[] = branchData?.data || [];
  const hospitalName = hospital?.name || "Main Hospital";

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

  const getActiveLocationLabel = () => {
    if (activeBranchId === "all") return `${hospitalName} (All Branches)`;
    if (activeBranchId === "main" || !activeBranch) return `${hospitalName} (Main)`;
    return activeBranch.name;
  };

  return (
    <div className="relative inline-block text-left font-sans" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:outline-none transition-colors cursor-pointer"
      >
        <Building2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
        <span className="font-medium text-slate-800 truncate max-w-[140px]">
          {getActiveLocationLabel()}
        </span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-0.5 w-56 rounded-md border border-slate-200 bg-white shadow-md py-1 z-50 divide-y divide-slate-100">
          <div className="px-3 py-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Select Branch</p>
          </div>

          <div className="py-0.5 max-h-56 overflow-y-auto">
            {/* All Branches Option */}
            <button
              type="button"
              onClick={() => {
                setActiveBranchId("all");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                activeBranchId === "all"
                  ? "bg-emerald-50 text-emerald-900 font-bold border-l-2 border-emerald-600"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Layers className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className="truncate">All Branches</span>
              </div>
              {activeBranchId === "all" && <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />}
            </button>

            {/* Main Hospital Option */}
            <button
              type="button"
              onClick={() => {
                setActiveBranchId("main");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                activeBranchId === "main" || (!activeBranch && activeBranchId !== "all")
                  ? "bg-emerald-50 text-emerald-900 font-bold border-l-2 border-emerald-600"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{hospitalName} (Main)</span>
              </div>
              {(activeBranchId === "main" || (!activeBranch && activeBranchId !== "all")) && (
                <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
              )}
            </button>

            {/* Branch Options */}
            {branches.map((b) => (
              <button
                key={b._id}
                type="button"
                onClick={() => {
                  setActiveBranchId(b._id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                  activeBranchId === b._id
                    ? "bg-emerald-50 text-emerald-900 font-bold border-l-2 border-emerald-600"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <GitBranch className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{b.name}</span>
                </div>
                {activeBranchId === b._id && <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
