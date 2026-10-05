import { apiClient } from "./client";

export interface StudentStats {
  myIssuesTotal: number;
  myIssuesOpen: number;
  myIssuesResolved: number;
  myAffectedCount: number;
  activeNoticesCount: number;
  upcomingEventsCount: number;
}

export async function getStudentStats(): Promise<StudentStats> {
  const res = await apiClient.get<StudentStats>("/student/stats");
  return res.data;
}

export async function getUserActivity(): Promise<any> {
  const res = await apiClient.get("/student/activity");
  return res.data;
}

export async function getUserProfile(): Promise<any> {
  const res = await apiClient.get("/student/profile");
  return res.data;
}
