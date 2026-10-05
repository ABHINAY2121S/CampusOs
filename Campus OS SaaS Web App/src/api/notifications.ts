import { apiClient } from "./client";

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  payload?: any;
  read: boolean;
  createdAt: string;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const res = await apiClient.get<NotificationItem[]>("/notifications");
  return res.data;
}

export async function markNotificationsRead(ids?: string[]): Promise<void> {
  await apiClient.post("/notifications/mark-read", { ids });
}

export async function clearNotifications(): Promise<void> {
  await apiClient.delete("/notifications");
}
