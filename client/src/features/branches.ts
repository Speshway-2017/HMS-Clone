import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Branch, Paginated } from "../types/domain";

interface BranchListParams {
  page?: number;
  hospitalId?: string;
}

interface BranchListResponse extends Paginated<Branch> {
  summary: { totalBranches: number; totalStaff: number };
}

export function useBranches(params: BranchListParams) {
  return useQuery({
    queryKey: ["branches", params],
    queryFn: async () => {
      const res = await api.get<BranchListResponse>("/branches", { params });
      return res.data;
    },
  });
}

export function useBranch(id: string | undefined) {
  return useQuery({
    queryKey: ["branches", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/branches/${id}`);
      return res.data.data.branch as Branch;
    },
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Branch> & { hospital: string }) => {
      const res = await api.post("/branches", payload);
      return res.data.data.branch as Branch;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });
}

export function useUpdateBranch(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Branch>) => {
      const res = await api.patch(`/branches/${id}`, payload);
      return res.data.data.branch as Branch;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/branches/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });
}
