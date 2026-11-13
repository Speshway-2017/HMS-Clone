import React, { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { useBranches } from "../features/branches";
import { Branch } from "../types/domain";

interface BranchContextType {
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  branches: Branch[];
  activeBranch: Branch | null;
  isLoading: boolean;
  isAllBranches: boolean;
  isReadOnlyView: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isHospitalAdmin = user?.role === "hospital_admin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    const stored = localStorage.getItem("hms_active_branch_id");
    // Admins must not default to "all" to prevent accidental read-only lockouts
    if (stored === "all") {
      return "main";
    }
    return stored || "main";
  });

  const hospitalId = user?.hospital ? (typeof user.hospital === "object" ? (user.hospital as any)._id : user.hospital) : undefined;
  const { data: branchesData, isLoading } = useBranches(
    { hospitalId: hospitalId || undefined, page: 1, limit: 100 },
    { enabled: !!user }
  );

  const branches = branchesData?.data || [];

  // Automatically lock hospital admin to their facility's valid branch without restriction
  useEffect(() => {
    if (isHospitalAdmin && branches.length > 0) {
      if (activeBranchId === "all" || !branches.some((b) => b._id === activeBranchId)) {
        const defaultBranchId = branches[0]._id;
        setActiveBranchIdState(defaultBranchId);
        localStorage.setItem("hms_active_branch_id", defaultBranchId);
      }
    }
  }, [isHospitalAdmin, branches, activeBranchId]);

  const activeBranch = branches.find((b) => b._id === activeBranchId) || null;

  // Hospital Admins and Super Admins are NEVER locked into read-only mode
  const isAllBranches = (isHospitalAdmin || isSuperAdmin) ? false : activeBranchId === "all";
  const isReadOnlyView = (isHospitalAdmin || isSuperAdmin) ? false : isAllBranches;

  const setActiveBranchId = (id: string) => {
    setActiveBranchIdState(id);
    localStorage.setItem("hms_active_branch_id", id);
    // Instantly invalidate React Query cache so all modules reload for the new branch!
    queryClient.invalidateQueries();
  };

  useEffect(() => {
    if (!isHospitalAdmin && activeBranchId !== "all" && activeBranchId !== "main" && branches.length > 0) {
      const exists = branches.some((b) => b._id === activeBranchId);
      if (!exists) {
        setActiveBranchId("all");
      }
    }
  }, [branches, activeBranchId, isHospitalAdmin]);

  return (
    <BranchContext.Provider
      value={{
        activeBranchId,
        setActiveBranchId,
        branches,
        activeBranch,
        isLoading,
        isAllBranches,
        isReadOnlyView,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranchContext = (): BranchContextType => {
  const context = useContext(BranchContext);
  if (!context) {
    return {
      activeBranchId: "main",
      setActiveBranchId: () => {},
      branches: [],
      activeBranch: null,
      isLoading: false,
      isAllBranches: false,
      isReadOnlyView: false,
    };
  }
  return context;
};
