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

/**
 * useAvailableSlots — Single source of truth for booked slot data.
 *
 * Fetches from GET /appointments/available-slots (the shared backend endpoint)
 * accessible by BOTH patient and receptionist roles.
 *
 * Cache policy:
 *   staleTime: 0  — never serve stale slot data
 *   gcTime: 0     — evict immediately when unused
 *   refetchInterval: 30_000 — auto-refresh every 30s while component is mounted
 *
 * IMPORTANT: Always invalidate ["appointment-slots", doctorId, date] after any
 * booking, cancellation, or reschedule mutation.
 */
export function useAvailableSlots(doctorId?: string, date?: string, patientId?: string) {
  return useQuery({
    queryKey: ["appointment-slots", doctorId, date, patientId],
    enabled: !!doctorId && !!date,
    staleTime: 0,          // Never serve stale slot availability data
    gcTime: 0,             // Evict from cache immediately when no longer subscribed
    refetchInterval: 30_000, // Refresh every 30s while booking panel is open
    queryFn: async () => {
      if (!doctorId || !date) return [] as string[];
      const res = await api.get<{ data: { bookedSlots: string[] } }>(
        "/appointments/available-slots",
        { params: { doctorId, date, patientId } }
      );
      return res.data.data.bookedSlots;
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
    onSuccess: () => {
      // Invalidate the appointments list (used by appointment history views)
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      // Invalidate the shared slot availability cache so the receptionist's
      // booking panel immediately reflects slots booked by this patient.
      queryClient.invalidateQueries({ queryKey: ["appointment-slots"] });
      // Also invalidate the reception-scoped booked-slots cache key used by
      // the receptionist dashboard's useBookedSlots hook.
      queryClient.invalidateQueries({ queryKey: ["reception", "appointments", "booked-slots"] });
    },
  });
}

export function useUpdateAppointment(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Appointment> & { id?: string }) => {
      const targetId = payload.id || id;
      if (!targetId) {
        throw new Error("No appointment ID specified for update.");
      }
      const { id: _ignore, ...data } = payload;
      const res = await api.patch(`/appointments/${targetId}`, data);
      return res.data.data.appointment as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-slots"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "appointments", "booked-slots"] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointment-slots"] });
      queryClient.invalidateQueries({ queryKey: ["reception", "appointments", "booked-slots"] });
    },
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
