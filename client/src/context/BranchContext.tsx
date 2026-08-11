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
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    return localStorage.getItem("hms_active_branch_id") || "all";
  });

  const hospitalId = user?.hospital ? (typeof user.hospital === "object" ? (user.hospital as any)._id : user.hospital) : undefined;
  const { data: branchesData, isLoading } = useBranches(
    { hospitalId: hospitalId || undefined, page: 1, limit: 100 },
    { enabled: !!user }
  );

  const branches = branchesData?.data || [];
  const activeBranch = branches.find((b) => b._id === activeBranchId) || null;

  const setActiveBranchId = (id: string) => {
    setActiveBranchIdState(id);
    localStorage.setItem("hms_active_branch_id", id);
    // Instantly invalidate React Query cache so all modules reload for the new branch!
    queryClient.invalidateQueries();
  };

  useEffect(() => {
    if (activeBranchId !== "all" && activeBranchId !== "main" && branches.length > 0) {
      const exists = branches.some((b) => b._id === activeBranchId);
      if (!exists) {
        setActiveBranchId("all");
      }
    }
  }, [branches, activeBranchId]);

  return (
    <BranchContext.Provider value={{ activeBranchId, setActiveBranchId, branches, activeBranch, isLoading }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranchContext = (): BranchContextType => {
  const context = useContext(BranchContext);
  if (!context) {
    return {
      activeBranchId: "all",
      setActiveBranchId: () => {},
      branches: [],
      activeBranch: null,
      isLoading: false,
    };
  }
  return context;
};
