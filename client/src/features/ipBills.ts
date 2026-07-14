import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useAdmittedPatients(search?: string) {
  return useQuery({
    queryKey: ["ip-bills", "admissions", search],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/ip-bills/admissions", {
        params: { search }
      });
      return res.data.data;
    }
  });
}

export function useIPBillDetails(admissionId: string | undefined) {
  return useQuery({
    queryKey: ["ip-bills", "details", admissionId],
    queryFn: async () => {
      const res = await api.get<{ data: { bill: any; items: any[]; totals: any } }>(
        `/ip-bills/${admissionId}`
      );
      return res.data.data;
    },
    enabled: !!admissionId
  });
}

export function useCreateIPBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { admissionId: string }) => {
      const res = await api.post("/ip-bills", payload);
      return res.data.data.bill;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ip-bills", "details", data.admission] });
    }
  });
}

export function useAddIPBillItem(billId: string | undefined, admissionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      category: string;
      description: string;
      quantity: number;
      days: number;
      unitPrice: number;
      discount: number;
      tax: number;
    }) => {
      const res = await api.post(`/ip-bills/${billId}/charges`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-bills", "details", admissionId] });
    }
  });
}

export function useUpdateIPBillItem(billId: string | undefined, admissionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      itemId: string;
      quantity: number;
      days: number;
      unitPrice: number;
      discount: number;
      tax: number;
    }) => {
      const { itemId, ...body } = payload;
      const res = await api.put(`/ip-bills/${billId}/charges/${itemId}`, body);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-bills", "details", admissionId] });
    }
  });
}

export function useDeleteIPBillItem(billId: string | undefined, admissionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/ip-bills/${billId}/charges/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-bills", "details", admissionId] });
    }
  });
}

export function useGenerateIPBillInvoice(billId: string | undefined, admissionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      discountType: string;
      hospitalDiscount: number;
      doctorDiscount: number;
      managementDiscount: number;
      approvedAmount: number;
      claimAmount: number;
      patientShare: number;
      paymentMode: string;
      taxRate: number;
    }) => {
      const res = await api.post(`/ip-bills/${billId}/generate-invoice`, payload);
      return res.data.data.bill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-bills", "details", admissionId] });
    }
  });
}

export function usePostIPBillPayment(billId: string | undefined, admissionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      amount: number;
      paymentMethod: string;
      mixedDetails?: any;
      transactionId?: string;
    }) => {
      const res = await api.post(`/ip-bills/${billId}/payment`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-bills", "details", admissionId] });
    }
  });
}

export function useIPBillReceiptDetails(billId: string | undefined, paymentId: string | undefined) {
  return useQuery({
    queryKey: ["ip-bills", "receipt", billId, paymentId],
    queryFn: async () => {
      const res = await api.get(`/ip-bills/${billId}/receipt/${paymentId}`);
      return res.data.data;
    },
    enabled: !!billId && !!paymentId
  });
}
