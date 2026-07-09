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

interface HospitalAnalytics {
  counts: {
    totalDoctors: number;
    totalStaff: number;
    totalPatients: number;
    todaysAppointments: number;
    totalDepartments: number;
    criticalStockCount: number;
    totalBeds: number;
    occupiedBeds: number;
    bedOccupancyPercent: number;
    totalRevenue: number;
  };
}

export function useHospitalAnalytics() {
  return useQuery({
    queryKey: ["analytics", "hospital"],
    queryFn: async () => {
      const res = await api.get("/analytics/hospital");
      return res.data.data as HospitalAnalytics;
    },
  });
}
