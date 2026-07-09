import { useMutation } from "@tanstack/react-query";
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
