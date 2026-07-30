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
