import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { RoleInfo } from "../types/domain";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await api.get("/roles");
      return res.data.data.roles as RoleInfo[];
    },
  });
}

export interface CreateRolePayload {
  role: string;
  label: string;
  description?: string;
  permissions?: string[];
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRolePayload) => {
      const res = await api.post("/roles", payload);
      return res.data.data.role;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export interface UpdateRolePayload {
  label?: string;
  description?: string;
  permissions?: string[];
}

export function useUpdateRole(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateRolePayload) => {
      const res = await api.patch(`/roles/${id}`, payload);
      return res.data.data.role;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/roles/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });
}


