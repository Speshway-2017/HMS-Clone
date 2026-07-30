import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Appointment, Paginated } from "../types/domain";

interface AppointmentListParams {
  page?: number;
  limit?: number;
  status?: string;
  doctor?: string;
  from?: string;
  to?: string;
  dateMode?: string;
}

interface AppointmentListResponse extends Paginated<Appointment> {
  counts: { total: number; today: number };
}

export function useAppointments(params: AppointmentListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["appointments", params],
    enabled: options?.enabled ?? true,
    refetchInterval: 10000,
    queryFn: async () => {
      const res = await api.get<AppointmentListResponse>("/appointments", { params });
      return res.data;
    },
  });
}

export function useAppointment(id: string | undefined) {
  return useQuery({
    queryKey: ["appointments", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/appointments/${id}`);
      return res.data.data.appointment as Appointment;
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Appointment>) => {
      const res = await api.post("/appointments", payload);
      return res.data.data.appointment as Appointment;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Appointment>) => {
      const res = await api.patch(`/appointments/${id}`, payload);
      return res.data.data.appointment as Appointment;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/appointments/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useCheckInAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/reception/appointments/${id}/check-in`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "queue-details"] });
    },
  });
}

export function mapAppointmentTypeForDisplay(type?: string): string {
  if (!type) return "Appointment";
  const t = type.toLowerCase().trim();
  switch (t) {
    case "consultation":
    case "regular consult":
    case "scheduled appointment":
    case "follow-up":
    case "follow-up appointment":
      return "Appointment";
    case "walk-in":
    case "walk-in visit":
      return "Walk-in";
    case "emergency":
    case "emergency visit":
      return "Emergency";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

