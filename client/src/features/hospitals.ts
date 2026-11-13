import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Hospital, Paginated } from "../types/domain";

interface HospitalListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

interface HospitalListResponse extends Paginated<Hospital> {
  counts: { total: number; active: number; inactive: number };
}

export function useHospitals(params: HospitalListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["hospitals", params],
    enabled: options?.enabled ?? true,
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
      return res.data.data as { hospital: Hospital; stats: { branchCount: number; primaryAdmin: { _id: string; name: string; email: string; employeeId?: string } | null }; branches: unknown[] };
    },
  });
}

export function useUnassignedHospitalAdmins(hospitalId?: string) {
  return useQuery({
    queryKey: ["hospitals", "unassigned-admins", hospitalId],
    queryFn: async () => {
      const res = await api.get("/hospitals/unassigned-admins", {
        params: hospitalId ? { hospitalId } : undefined,
      });
      return res.data.data.admins as { _id: string; name: string; email: string; employeeId?: string }[];
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
    onSuccess: (data) => {
      if (data?.name) localStorage.setItem("hms_hospital_name", data.name);
      if (data?.logoUrl) localStorage.setItem("hms_hospital_logo", data.logoUrl);
      if (data?._id) {
        queryClient.setQueryData(["hospitals", data._id], data);
      }
      queryClient.setQueryData(["hospitals", "me"], data);
      queryClient.setQueryData(["hospitals", "public"], data);
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
    },
  });
}

export function useUpdateHospital(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Hospital> & { primaryAdminId?: string }) => {
      const res = await api.patch(`/hospitals/${id}`, payload);
      return res.data.data.hospital as Hospital;
    },
    onSuccess: (data) => {
      if (data?.name) localStorage.setItem("hms_hospital_name", data.name);
      if (data?.logoUrl) localStorage.setItem("hms_hospital_logo", data.logoUrl);
      queryClient.setQueryData(["hospitals", id], data);
      queryClient.setQueryData(["hospitals", "me"], data);
      queryClient.setQueryData(["hospitals", "public"], data);
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      queryClient.invalidateQueries({ queryKey: ["hospitals", id] });
      queryClient.invalidateQueries({ queryKey: ["hospitals", "me"] });
      queryClient.invalidateQueries({ queryKey: ["hospitals", "public"] });
    },
  });
}

export function useDeleteHospital() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hospitals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      queryClient.invalidateQueries({ queryKey: ["hospitals", "me"] });
      queryClient.invalidateQueries({ queryKey: ["hospitals", "public"] });
    },
  });
}

export function useMyHospital(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["hospitals", "me"],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await api.get("/hospitals/me");
      return res.data.data.hospital as Hospital;
    },
  });
}

export function usePublicHospital() {
  return useQuery({
    queryKey: ["hospitals", "public"],
    queryFn: async () => {
      const res = await api.get("/hospitals/public");
      return (res.data.data.hospital ?? null) as Hospital | null;
    },
  });
}

export function useUpdateMyHospital() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Hospital>) => {
      const res = await api.patch("/hospitals/me", payload);
      return res.data.data.hospital as Hospital;
    },
    onSuccess: (data) => {
      if (data?.name) localStorage.setItem("hms_hospital_name", data.name);
      if (data?.logoUrl) localStorage.setItem("hms_hospital_logo", data.logoUrl);
      queryClient.setQueryData(["hospitals", "me"], data);
      queryClient.setQueryData(["hospitals", "public"], data);
      if (data?._id) {
        queryClient.setQueryData(["hospitals", data._id], data);
      }
      queryClient.invalidateQueries({ queryKey: ["hospitals", "me"] });
      queryClient.invalidateQueries({ queryKey: ["hospitals", "public"] });
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
    },
  });
}
