import React, { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, GitBranch, Layers } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useBranchContext } from "../../context/BranchContext";

export const BranchSwitcher: React.FC = () => {
  const { user } = useAuth();
  const { activeBranchId, setActiveBranchId, branches, activeBranch } = useBranchContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click (hook called unconditionally)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Only show branch switcher if hospital has 1 or more registered branches (after all hooks)
  if (!user || user.role !== "hospital_admin" || !branches || branches.length === 0) {
    return null;
  }

  const hospitalName = typeof user?.hospital === "object" && user?.hospital ? (user.hospital as any).name : "Main Hospital";

  const getActiveLocationLabel = () => {
    if (activeBranchId === "all") return `${hospitalName} (All Branches)`;
    if (activeBranchId === "main" || !activeBranch) return `${hospitalName} (Main HQ)`;
    return activeBranch.name;
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
          {activeBranchId === "all" ? (
            <Layers className="h-3.5 w-3.5 text-navy-600" />
          ) : activeBranchId === "main" || !activeBranch ? (
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
          ) : (
            <GitBranch className="h-3.5 w-3.5 text-emerald-600" />
          )}
        </div>

        <div className="flex flex-col text-left leading-tight">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Location</span>
          <span className="font-extrabold text-slate-800 truncate max-w-[140px] sm:max-w-[180px]">
            {getActiveLocationLabel()}
          </span>
        </div>

        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Switch Branch Context</p>
            <p className="text-xs font-semibold text-slate-600 truncate">{hospitalName}</p>
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {/* All Branches Option */}
            <button
              type="button"
              onClick={() => {
                setActiveBranchId("all");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                activeBranchId === "all"
                  ? "bg-navy-50 text-navy-800 font-extrabold ring-1 ring-navy-200"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-navy-600" />
                <div className="text-left">
                  <div>All Branches</div>
                  <div className="text-[10px] font-normal text-slate-400">Network-Wide Aggregated View</div>
                </div>
              </div>
              {activeBranchId === "all" && <Check className="h-4 w-4 text-navy-700" />}
            </button>

            {/* Main Hospital (HQ) Option */}
            <button
              type="button"
              onClick={() => {
                setActiveBranchId("main");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                activeBranchId === "main" || (!activeBranch && activeBranchId !== "all")
                  ? "bg-blue-50 text-blue-900 font-extrabold ring-1 ring-blue-200"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-blue-600" />
                <div className="text-left">
                  <div>{hospitalName} (Main)</div>
                  <div className="text-[10px] font-normal text-slate-400">Main Headquarters Only</div>
                </div>
              </div>
              {(activeBranchId === "main" || (!activeBranch && activeBranchId !== "all")) && <Check className="h-4 w-4 text-blue-700" />}
            </button>

            {/* Branch Options */}
            {branches.length > 0 && (
              <div className="pt-1 border-t border-slate-100 mt-1">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branches ({branches.length})</div>
                {branches.map((branch) => {
                  const isSelected = activeBranchId === branch._id;
                  return (
                    <button
                      key={branch._id}
                      type="button"
                      onClick={() => {
                        setActiveBranchId(branch._id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-emerald-50 text-emerald-900 font-extrabold ring-1 ring-emerald-200"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <GitBranch className={`h-4 w-4 ${isSelected ? "text-emerald-600" : "text-slate-400"}`} />
                        <div className="text-left truncate">
                          <div className="truncate">{branch.name}</div>
                          <div className="text-[10px] font-normal text-slate-400">{branch.city || branch.category || "Branch Facility"}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
