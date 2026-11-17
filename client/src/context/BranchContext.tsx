import React, { createContext, useContext } from "react";
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

const defaultContext: BranchContextType = {
  activeBranchId: "main",
  setActiveBranchId: () => {},
  branches: [],
  activeBranch: null,
  isLoading: false,
  isAllBranches: false,
  isReadOnlyView: false,
};

const BranchContext = createContext<BranchContextType>(defaultContext);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BranchContext.Provider value={defaultContext}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranchContext = (): BranchContextType => {
  const context = useContext(BranchContext);
  return context || defaultContext;
};
