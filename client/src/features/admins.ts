import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Admin, Paginated } from "../types/domain";

interface AdminListParams {
  page?: number;
  hospitalId?: string;
  role?: string;
}

export function useAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ["admins", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/admins/${id}`);
      return res.data.data.admin as Admin;
    },
  });
}

export function useAdmins(params: AdminListParams) {
  return useQuery({
    queryKey: ["admins", params],
    queryFn: async () => {
      const res = await api.get<Paginated<Admin>>("/admins", { params });
      return res.data;
    },
  });
}

interface CreateAdminPayload {
  name: string;
  email: string;
  role: "hospital_admin" | "accountant";
  hospital: string;
  title?: string;
  phone?: string;
  employeeId?: string;
}

export function useCreateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAdminPayload) => {
      const res = await api.post("/admins", payload);
      return res.data.data as { admin: { id: string; name: string; email: string; role: string }; tempPassword: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins"] }),
  });
}

export function useUpdateAdmin(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Admin>) => {
      const res = await api.patch(`/admins/${id}`, payload);
      return res.data.data.admin as Admin;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins"] }),
  });
}

export function useDeleteAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admins/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins"] }),
  });
}
