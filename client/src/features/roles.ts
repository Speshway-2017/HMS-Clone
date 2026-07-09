import { useQuery } from "@tanstack/react-query";
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
