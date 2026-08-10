import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Doctor, Paginated } from "../types/domain";
import { useAuth } from "../context/AuthContext";

interface DoctorListParams {
  page?: number;
  limit?: number;
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
      return res.data.data as {
        doctor: Doctor;
        stats: { patientsTreated: number };
        patients: any[];
      };
    },
  });
}

export interface DoctorPerformanceData {
  doctor: Doctor;
  metrics: {
    completedTotal: number;
    upcomingTotal: number;
    totalBookings: number;
    monthlyVolume: number;
    patientSatisfaction: number;
    avgRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
    monthlyTrends: { month: string; consultations: number }[];
  };
  feedback: {
    _id: string;
    patientName: string;
    patientUhid?: string;
    rating: number;
    comment: string;
    createdAt: string;
  }[];
}

export function useDoctorPerformance(id?: string) {
  return useQuery({
    queryKey: ["doctors", id, "performance"],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/doctors/${id}/performance`);
      return res.data.data as DoctorPerformanceData;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
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
    onSuccess: () => {
      toast.success("Doctor deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      queryClient.invalidateQueries({ queryKey: ["public", "doctors"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete doctor.");
    }
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

