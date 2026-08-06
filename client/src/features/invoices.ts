import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Invoice, Paginated } from "../types/domain";

interface InvoiceListParams {
  page?: number;
  status?: string;
  patient?: string;
  billingType?: string;
  limit?: number;
}

interface InvoiceListResponse extends Paginated<Invoice> {
  counts: {
    totalBilling: number;
    netRevenue: number;
    pendingCount: number;
    completedCount?: number;
    outstandingAmount?: number;
    todayCollection?: number;
    todayPharmacyRevenue?: number;
    cashCollection?: number;
    upiCollection?: number;
    cardCollection?: number;
    currentMonthRevenue?: number;
    monthlySeries?: { month: string; revenue: number; payments: number }[];
    all?: number;
    op?: number;
    ip?: number;
    pharmacy?: number;
    laboratory?: number;
  };
}

export function useInvoices(params: InvoiceListParams, options?: { enabled?: boolean }) {
  const qKey = params.billingType ? params.billingType.toUpperCase() : "ALL";
  return useQuery({
    queryKey: ["invoices", qKey, params],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await api.get<InvoiceListResponse>("/invoices", { params });
      return res.data;
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoices", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/invoices/${id}`);
      return res.data.data.invoice as Invoice;
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Invoice> & { patient: string }) => {
      const res = await api.post("/invoices", payload);
      return res.data.data.invoice as Invoice;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Invoice>) => {
      const res = await api.patch(`/invoices/${id}`, payload);
      return res.data.data.invoice as Invoice;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export interface PendingOverdueParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  department?: string;
  doctor?: string;
  billingType?: string;
  status?: string;
  branch?: string;
  search?: string;
  uhid?: string;
}

export interface PendingOverdueItem {
  _id: string;
  invoiceNo: string;
  patient: { _id: string; name: string; uhid: string; phone: string; age: number; gender: string };
  doctor: { _id: string; name: string; specialization: string } | null;
  department: { _id: string; name: string } | null;
  billingType: string;
  issuedAt: string;
  dueDate: string | null;
  daysOverdue: number;
  status: "pending" | "partially_paid" | "overdue";
  totals: { subtotal: number; total: number; patientBalance: number; insuranceCovered: number; taxAmount: number };
  amountPaid: number;
  pendingAmount: number;
  paymentMode: string;
}

export interface PendingOverdueResponse {
  status: string;
  data: PendingOverdueItem[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
  summary: {
    pendingPatients: number;
    totalPendingAmount: number;
    overdueAmount: number;
    todayCollection: number;
    monthCollection: number;
  };
}

export function usePendingOverdue(params: PendingOverdueParams) {
  return useQuery({
    queryKey: ["invoices", "pending-overdue", params],
    queryFn: async () => {
      const res = await api.get<PendingOverdueResponse>("/invoices/pending-overdue", { params });
      return res.data;
    },
    staleTime: 30_000,
  });
}
