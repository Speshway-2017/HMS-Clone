import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface GlobalAnalytics {
  counts: {
    totalHospitals: number;
    activeHospitals: number;
    totalBranches: number;
    totalDepartments: number;
    totalAdmins: number;
    totalBedCapacity: number;
  };
  pending: {
    totalRevenue: boolean;
    activePatients: boolean;
    avgWaitTime: boolean;
    bedOccupancy: boolean;
  };
  charts: {
    branchesPerHospital: { hospital: string; branches: number }[];
    adminsByRole: { role: string; count: number }[];
  };
}

export function useGlobalAnalytics() {
  return useQuery({
    queryKey: ["analytics", "global"],
    queryFn: async () => {
      const res = await api.get("/analytics/global");
      return res.data.data as GlobalAnalytics;
    },
  });
}
