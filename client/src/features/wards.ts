import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export type WardType = 
  | "General Ward" 
  | "Semi-Private Ward" 
  | "Private Ward" 
  | "ICU" 
  | "NICU" 
  | "PICU" 
  | "Emergency" 
  | "Emergency Ward" 
  | "Operation Theatre" 
  | "Labour Ward" 
  | "Semi Private" 
  | "Private" 
  | "Deluxe" 
  | "VIP";

export interface WardInfo {
  _id: string;
  name: string;
  code: string;
  wardType: WardType;
  floorNumber: number;
  maxRooms?: number;
  nurseStation?: string;
  description: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export interface ListWardsResponse {
  wards: WardInfo[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useWards(params: { search?: string; wardType?: string; status?: string; page?: number; limit?: number } = {}) {
  const activeBranchId = localStorage.getItem("hms_active_branch_id") || "all";
  return useQuery({
    queryKey: ["wards", params, activeBranchId],
    queryFn: async () => {
      const res = await api.get<{ data: ListWardsResponse }>("/wards", { params });
      return res.data.data;
    }
  });
}

export interface CreateWardPayload {
  name: string;
  code: string;
  wardType: string;
  floorNumber: number;
  maxRooms?: number;
  nurseStation?: string;
  description?: string;
  status?: string;
}

export function useCreateWard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWardPayload) => {
      const res = await api.post("/wards", payload);
      return res.data.data.ward;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
    }
  });
}

export interface UpdateWardPayload {
  name?: string;
  code?: string;
  wardType?: string;
  floorNumber?: number;
  maxRooms?: number;
  nurseStation?: string;
  description?: string;
  status?: string;
}

export function useUpdateWard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateWardPayload & { id: string }) => {
      const res = await api.patch(`/wards/${id}`, payload);
      return res.data.data.ward;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    }
  });
}

export function useDeleteWard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/wards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
    }
  });
}
