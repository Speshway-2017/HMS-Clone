import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface HospitalListItem {
  _id: string;
  name: string;
  code: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: string;
  totalBranches: number;
  totalSales: number;
  totalInvoices: number;
  createdAt?: string;
}

export interface SalesByHospitalItem {
  name: string;
  code: string;
  sales: number;
  invoices: number;
}

export interface SalesTrendItem {
  date: string;
  sales: number;
}

export interface GlobalAnalytics {
  hospitals: {
    total: number;
    active: number;
    inactive: number;
    list: HospitalListItem[];
  };
  sales: {
    totalSales: number;
    todaySales: number;
    thisMonthSales: number;
    totalInvoices: number;
    salesByHospital: SalesByHospitalItem[];
    salesTrend: SalesTrendItem[];
  };
  counts: {
    totalHospitals: number;
    activeHospitals: number;
    totalSales: number;
    todaySales: number;
    thisMonthSales: number;
    totalInvoices: number;
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

export interface HospitalAnalytics {
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
  sales?: {
    totalSales: number;
    paidInvoices: number;
  };
}

export function useHospitalAnalytics(hospitalId?: string) {
  return useQuery({
    queryKey: ["analytics", "hospital", hospitalId],
    queryFn: async () => {
      const params = hospitalId ? { hospitalId } : undefined;
      const res = await api.get("/analytics/hospital", { params });
      return res.data.data as HospitalAnalytics;
    },
  });
}
