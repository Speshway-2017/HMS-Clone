import React from "react";
import { Eye, ShieldAlert } from "lucide-react";
import { useBranchContext } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";

interface AllBranchesNoticeBannerProps {
  customMessage?: string;
  className?: string;
}

export const AllBranchesNoticeBanner: React.FC<AllBranchesNoticeBannerProps> = ({ customMessage, className = "" }) => {
  const { isAllBranches } = useBranchContext();
  const { user } = useAuth();

  // Super Admin has global enterprise authority, and Hospital Admins have full authority over their facility.
  // Neither should ever see this banner or be restricted by branch read-only mode.
  if (!isAllBranches || user?.role === "super_admin" || user?.role === "hospital_admin" || user?.role === "admin") return null;

  return (
    <div className={`mb-4 flex items-center justify-between rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 via-amber-50/90 to-amber-100/80 px-4 py-3 text-xs font-medium text-amber-900 shadow-sm animate-in fade-in duration-200 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-200/80 text-amber-800 ring-1 ring-amber-300">
          <Eye className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-amber-950 uppercase tracking-wider text-[11px]">
              Network-Wide Aggregated View ('All Branches' Active)
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
              <ShieldAlert className="h-3 w-3" /> Read-Only Mode
            </span>
          </div>
          <p className="mt-0.5 text-slate-700">
            {customMessage || "Creation, editing, and deletion actions are disabled in 'All Branches' view. Switch to a specific branch in the top right location selector to perform changes."}
          </p>
        </div>
      </div>
    </div>
  );
};
