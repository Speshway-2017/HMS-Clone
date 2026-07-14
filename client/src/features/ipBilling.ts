import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useIPAdmissions(search?: string) {
  return useQuery({
    queryKey: ["ip-billing", "admissions", search],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/ip-billing/admissions", {
        params: { search }
      });
      return res.data.data;
    }
  });
}

export function useIPBillingDetails(admissionId: string | undefined) {
  return useQuery({
    queryKey: ["ip-billing", "details", admissionId],
    queryFn: async () => {
      const res = await api.get<{ data: { admission: any; charges: any[]; totals: any } }>(
        `/ip-billing/admissions/${admissionId}/details`
      );
      return res.data.data;
    },
    enabled: !!admissionId
  });
}

export function useAddIPCharge(admissionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      category: string;
      serviceName: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      tax: number;
      remarks?: string;
    }) => {
      const res = await api.post(`/ip-billing/admissions/${admissionId}/charges`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-billing", "details", admissionId] });
    }
  });
}

export function useDeleteIPCharge(admissionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (chargeId: string) => {
      await api.delete(`/ip-billing/admissions/${admissionId}/charges/${chargeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-billing", "details", admissionId] });
    }
  });
}

export function usePostIPAdvance(admissionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      amount: number;
      paymentMethod: string;
      transactionId: string;
      type: "advance" | "refund";
    }) => {
      const res = await api.post(`/ip-billing/admissions/${admissionId}/payments`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-billing", "details", admissionId] });
    }
  });
}

export function useGenerateIPInvoice(admissionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      discountType: string;
      hospitalDiscount: number;
      doctorDiscount: number;
      managementDiscount: number;
      insuranceCovered: number;
      approvedAmount: number;
      claimAmount: number;
      patientShare: number;
      paymentMode: string;
      taxRate: number;
    }) => {
      const res = await api.post(`/ip-billing/admissions/${admissionId}/generate-invoice`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-billing"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    }
  });
}
