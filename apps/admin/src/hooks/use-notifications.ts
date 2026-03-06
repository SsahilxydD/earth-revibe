import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface AdminNotification {
  type: string;
  title: string;
  message: string;
  count: number;
  priority: "high" | "medium";
}

export function useNotifications() {
  return useQuery<AdminNotification[]>({
    queryKey: ["admin-notifications"],
    queryFn: () => api.get("/admin/notifications"),
    refetchInterval: 30000,
  });
}

export function useNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: ["admin-notification-count"],
    queryFn: () => api.get("/admin/notifications/count"),
    refetchInterval: 30000,
  });
}
