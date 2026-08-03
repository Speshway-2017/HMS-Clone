import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export type NotificationType = "appointment" | "inventory" | "invoice" | "patient" | "admission_request" | "general";
export type NotificationSeverity = "info" | "warning" | "critical";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  severity: NotificationSeverity;
  createdAt: string;
}

interface NotificationsResponse {
  status: string;
  data: {
    notifications: AppNotification[];
    total: number;
  };
}

async function fetchNotifications(): Promise<NotificationsResponse> {
  const { data } = await api.get<NotificationsResponse>("/notifications");
  return data;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/notifications/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["nurse", "notifications"] });
    },
  });
}
