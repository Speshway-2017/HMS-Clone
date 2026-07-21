import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Doctor, Paginated } from "../types/domain";
import { useAuth } from "../context/AuthContext";

interface DoctorListParams {
  page?: number;
  department?: string;
  status?: string;
  search?: string;
}

interface DoctorListResponse extends Paginated<Doctor> {
  counts: { total: number; onDuty: number; onLeave: number };
}

export function useDoctors(params: DoctorListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["doctors", params],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await api.get<DoctorListResponse>("/doctors", { params });
      return res.data;
    },
  });
}

export function useDoctor(id: string | undefined) {
  return useQuery({
    queryKey: ["doctors", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/doctors/${id}`);
      return res.data.data as { doctor: Doctor; stats: { patientsTreated: number } };
    },
  });
}

export function useDoctorPerformance(id: string | undefined) {
  return useQuery({
    queryKey: ["doctors", "performance", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/doctors/${id}/performance`);
      return res.data.data as { doctor: Doctor; metrics: { monthlyVolume: number; completedTotal: number; patientSatisfaction: number } };
    },
  });
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Doctor>) => {
      const res = await api.post("/doctors", payload);
      return res.data.data as { doctor: Doctor; tempPassword: string | null };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors"] }),
  });
}

export function useUpdateDoctor(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Doctor>) => {
      const res = await api.patch(`/doctors/${id}`, payload);
      return res.data.data.doctor as Doctor;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors"] }),
  });
}

export function useDeleteDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/doctors/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors"] }),
  });
}

export function useDoctorProfileMe(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["doctors", "me"],
    enabled: (options?.enabled ?? true) && user?.role === "doctor",
    retry: false,
    queryFn: async () => {
      const res = await api.get("/doctors/me");
      return res.data.data.doctor as Doctor;
    },
  });
}

export function useUpdateDoctorProfileMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Doctor> & { workingHours?: any[]; consultationSettings?: any }) => {
      const res = await api.patch("/doctors/me", payload);
      return res.data.data.doctor as Doctor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors", "me"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "doctors"] });
    },
  });
}

