import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Department } from "../types/domain";

export function useDepartments(hospitalId?: string) {
  return useQuery({
    queryKey: ["departments", hospitalId],
    queryFn: async () => {
      const res = await api.get("/departments", { params: hospitalId ? { hospitalId } : {} });
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
  bedOccupancy: { pending: boolean; message?: string };
  patientVolumeTrend: { pending: boolean; data: unknown[] };
  staffPerformance: { pending: boolean; data: unknown[] };
  patientScore: { pending: boolean };
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
    mutationFn: async (payload: Partial<Department> & { hospital: string }) => {
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

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/departments/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] }),
  });
}
