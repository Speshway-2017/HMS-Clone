import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Supplier } from "../types/domain";

export function useSuppliers(search?: string) {
  const activeBranchId = localStorage.getItem("hms_active_branch_id") || "all";
  return useQuery({
    queryKey: ["suppliers", search, activeBranchId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search && search.trim()) params.search = search.trim();
      const res = await api.get<{ status: string; results: number; data: { suppliers: Supplier[] } }>("/suppliers", {
        params,
      });
      return res.data.data.suppliers;
    },
  });
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: ["supplier", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: { supplier: Supplier } }>(`/suppliers/${id}`);
      return res.data.data.supplier;
    },
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Supplier>) => {
      const res = await api.post<{ status: string; data: { supplier: Supplier } }>("/suppliers", payload);
      return res.data.data.supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useUpdateSupplier(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Supplier>) => {
      const res = await api.patch<{ status: string; data: { supplier: Supplier } }>(`/suppliers/${id}`, payload);
      return res.data.data.supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier", id] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
