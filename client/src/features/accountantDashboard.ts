import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AccountantDashboardData {
  kpi: {
    netRevenue: number;
    totalBilling: number;
    outstandingAmount: number;
    pendingCount: number;
    paidCount: number;
    cancelledCount: number;
    partiallyPaidCount: number;
    pendingClaimsCount?: number;
    pendingClaimsValue?: number;
    monthlyExpenses?: number;
  };
  today: {
    totalCollection: number;
    consultationRevenue: number;
    pharmacyRevenue: number;
    labRevenue: number;
    ipRevenue: number;
    cash: number;
    upi: number;
    card: number;
    netBanking: number;
    cheque: number;
  };
  invoiceSummary: {
    op: number;
    ip: number;
    pharmacy: number;
    lab: number;
    radiology: number;
    emergency: number;
    pending: number;
    paid: number;
    cancelled: number;
    partiallyPaid: number;
  };
  charts: {
    daily: { date: string; label: string; revenue: number }[];
    monthly: { month: string; label: string; revenue: number; expenses?: number; profit?: number }[];
    paymentMethodDistribution: { method: string; amount: number }[];
    billingTypeDistribution: { type: string; amount: number }[];
    claimsStatusDistribution?: { status: string; count: number }[];
    expenseCategoryDistribution?: { category: string; amount: number }[];
    doctorRevenueDistribution?: { name: string; amount: number }[];
    taxComplianceSeries?: { month: string; subtotal: number; serviceFee: number; taxCollected: number; total: number }[];
  };
  recentTransactions: {
    _id: string;
    invoiceRef: string;
    patientName: string;
    patientUhid: string;
    billingType: string;
    paymentMethod: string;
    amount: number;
    paidAt: string;
    status: string;
    collectedBy: string;
  }[];
  recentExpenses?: {
    _id: string;
    category: string;
    description: string;
    amount: number;
    createdBy?: { name: string };
    date: string;
    status: string;
  }[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAccountantDashboard() {
  return useQuery<AccountantDashboardData>({
    queryKey: ["accountant-dashboard"],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: AccountantDashboardData }>(
        "/accountant/dashboard"
      );
      return res.data.data;
    },
    refetchInterval: 60_000,       // auto-refresh every 60 seconds
    staleTime: 30_000,             // consider fresh for 30s
    retry: 2,
  });
}
