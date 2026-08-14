import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { InventoryItem, Paginated } from "../types/domain";

interface InventoryListParams {
  page?: number;
  category?: string;
  search?: string;
  limit?: number;
}

interface InventoryListResponse extends Paginated<InventoryItem> {
  counts: { total: number; critical: number; totalValue: number };
}

export function useInventory(params?: InventoryListParams) {
  const activeBranchId = localStorage.getItem("hms_active_branch_id") || "all";
  return useQuery({
    queryKey: ["inventory", params, activeBranchId],
    queryFn: async () => {
      const res = await api.get<InventoryListResponse>("/inventory", { params });
      return res.data;
    },
  });
}

export function useInventoryItem(id: string | undefined) {
  return useQuery({
    queryKey: ["inventory", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/inventory/${id}`);
      return res.data.data.item as InventoryItem;
    },
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<InventoryItem>) => {
      const res = await api.post("/inventory", payload);
      return res.data.data.item as InventoryItem;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateInventoryItem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<InventoryItem>) => {
      const res = await api.patch(`/inventory/${id}`, payload);
      return res.data.data.item as InventoryItem;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useMedicineNames(search?: string) {
  const activeBranchId = localStorage.getItem("hms_active_branch_id") || "all";
  return useQuery({
    queryKey: ["medicine-names", search, activeBranchId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const res = await api.get<{ status: string; data: string[] }>("/inventory/medicine-names", { params });
      return res.data.data;
    },
  });
}

export interface MedicineVariant {
  _id: string;
  name: string;
  strength: string;
  stockQty: number;
  unitCost: number;
  sku: string;
}

export function useMedicineVariants(name: string) {
  const activeBranchId = localStorage.getItem("hms_active_branch_id") || "all";
  return useQuery({
    queryKey: ["medicine-variants", name, activeBranchId],
    enabled: !!name && name.trim().length > 0,
    queryFn: async () => {
      const res = await api.get<{ status: string; data: MedicineVariant[] }>("/inventory/medicine-variants", {
        params: { name },
      });
      return res.data.data;
    },
  });
}
