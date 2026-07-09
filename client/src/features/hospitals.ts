import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Hospital, Paginated } from "../types/domain";

interface HospitalListParams {
  page?: number;
  search?: string;
  status?: string;
}

interface HospitalListResponse extends Paginated<Hospital> {
  counts: { total: number; active: number; inactive: number };
}

export function useHospitals(params: HospitalListParams) {
  return useQuery({
    queryKey: ["hospitals", params],
    queryFn: async () => {
      const res = await api.get<HospitalListResponse>("/hospitals", { params });
      return res.data;
    },
  });
}

export function useHospital(id: string | undefined) {
  return useQuery({
    queryKey: ["hospitals", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/hospitals/${id}`);
      return res.data.data as { hospital: Hospital; stats: { branchCount: number; primaryAdmin: { name: string; email: string } | null }; branches: unknown[] };
    },
  });
}

export function useUnassignedHospitalAdmins() {
  return useQuery({
    queryKey: ["hospitals", "unassigned-admins"],
    queryFn: async () => {
      const res = await api.get("/hospitals/unassigned-admins");
      return res.data.data.admins as { _id: string; name: string; email: string }[];
    },
  });
}

export function useCreateHospital() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Hospital> & { primaryAdminId?: string }) => {
      const res = await api.post("/hospitals", payload);
      return res.data.data.hospital as Hospital;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hospitals"] }),
  });
}

export function useUpdateHospital(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Hospital> & { primaryAdminId?: string }) => {
      const res = await api.patch(`/hospitals/${id}`, payload);
      return res.data.data.hospital as Hospital;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hospitals"] }),
  });
}

export function useDeleteHospital() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hospitals/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hospitals"] }),
  });
}
