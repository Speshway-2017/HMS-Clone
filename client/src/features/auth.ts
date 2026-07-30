import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface ChangePasswordPayload {
  newPassword: string;
  confirmPassword: string;
}

async function changePasswordFn(payload: ChangePasswordPayload) {
  const { data } = await api.patch("/auth/change-password", payload);
  return data;
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePasswordFn });
}

export interface UpdateProfilePayload {
  name?: string;
  avatarUrl?: string;
}

async function updateProfileFn(payload: UpdateProfilePayload) {
  const { data } = await api.patch("/auth/update-profile", payload);
  return data;
}

export function useUpdateProfile() {
  return useMutation({ mutationFn: updateProfileFn });
}

export interface RegisterPatientPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  age?: number | null;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  allergies?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
}

export function useRegisterPatientUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegisterPatientPayload) => {
      const res = await api.post("/auth/register", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reception"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}
