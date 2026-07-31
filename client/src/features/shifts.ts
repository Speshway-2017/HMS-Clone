import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface ShiftMaster {
  _id: string;
  hospital: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  halfDayHours: number;
  fullDayHours: number;
  crossesMidnight: boolean;
  isActive: boolean;
  assignedEmployeesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function useShifts() {
  return useQuery({
    queryKey: ["shifts"],
    queryFn: async () => {
      const res = await api.get("/shifts");
      return res.data.data.shifts as ShiftMaster[];
    },
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ShiftMaster>) => {
      const res = await api.post("/shifts", payload);
      return res.data.data.shift as ShiftMaster;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ShiftMaster> & { id: string }) => {
      const res = await api.patch(`/shifts/${id}`, payload);
      return res.data.data.shift as ShiftMaster;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useAssignShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { employeeId: string; employeeType?: string; shiftName: string }) => {
      const res = await api.post("/shifts/assign", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
  });
}
