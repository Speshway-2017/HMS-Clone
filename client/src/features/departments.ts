import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Department } from "../types/domain";

export function useDepartments(hospitalId?: string | { hospitalId?: string; activeOnly?: boolean }, activeOnly?: boolean) {
  const hId = typeof hospitalId === "string" ? hospitalId : hospitalId?.hospitalId;
  const isOnlyActive = typeof hospitalId === "object" ? hospitalId?.activeOnly : activeOnly;

  return useQuery({
    queryKey: ["departments", hId, isOnlyActive],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (hId) params.hospitalId = hId;
      if (isOnlyActive) params.activeOnly = "true";

      const res = await api.get("/departments", { params });
      return res.data.data.departments as Department[];
    },
  });
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: ["departments", "one", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/departments/${id}`);
      return res.data.data.department as Department;
    },
  });
}

interface DepartmentMetrics {
  department: Department;
  bedOccupancy: { percent: number; occupied: number; total: number };
  patientVolumeTrend: { pending: boolean; data: unknown[] };
  staffPerformance: { pending: boolean; data: unknown[] };
}

export function useDepartmentMetrics(id: string | undefined) {
  return useQuery({
    queryKey: ["departments", "metrics", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/departments/${id}/metrics`);
      return res.data.data as DepartmentMetrics;
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Department> & { hospital?: string }) => {
      const res = await api.post("/departments", payload);
      return res.data.data.department as Department;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useUpdateDepartment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Department>) => {
      const res = await api.patch(`/departments/${id}`, payload);
      return res.data.data.department as Department;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useToggleDepartmentStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/departments/${id}/toggle-status`);
      return res.data.data as { department: Department; message: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/departments/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
}

/**
 * Listen for Socket.IO department events and invalidate the departments query
 * so all open dashboards update in real-time without a page refresh.
 */
export function useDepartmentSocketSync(socket: { on: (evt: string, cb: (...args: unknown[]) => void) => void; off: (evt: string, cb: (...args: unknown[]) => void) => void } | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const refresh = () => queryClient.invalidateQueries({ queryKey: ["departments"] });

    socket.on("department:updated", refresh);
    socket.on("department:statusChanged", refresh);
    socket.on("department:deleted", refresh);

    return () => {
      socket.off("department:updated", refresh);
      socket.off("department:statusChanged", refresh);
      socket.off("department:deleted", refresh);
    };
  }, [socket, queryClient]);
}
