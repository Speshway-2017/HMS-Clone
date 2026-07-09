import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export type NotificationType = "appointment" | "inventory" | "invoice" | "patient";
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
    // Refetch every 60 seconds so new events surface automatically
    refetchInterval: 60_000,
    // Also refetch when tab regains focus
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
