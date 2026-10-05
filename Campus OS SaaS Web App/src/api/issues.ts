import { apiClient } from "./client";

export interface Issue {
  id: string;
  displayId: string;
  title: string;
  description: string;
  category: string;
  building?: string | null;
  room?: string | null;
  asset?: string | null;
  urgency: string;
  status: string;
  priorityScore: number;
  priorityBreakdown?: any;
  createdAt: string;
  reporter?: { id: string; name: string };
  assignee?: { id: string; name: string };
  department?: { id: string; name: string; code: string };
  cluster?: { id: string; affectedCount: number; mergedCount: number };
  _count?: { comments: number; affectedUsers: number };
}

export interface AnalyzeResult {
  category: string;
  building?: string | null;
  room?: string | null;
  asset?: string | null;
  urgency: string;
  confidence: number;
  embedding: number[];
  similarIssues: Array<{
    id: string;
    displayId: string;
    title: string;
    description: string;
    category: string;
    building?: string | null;
    room?: string | null;
    similarity: number;
    priorityScore: number;
  }>;
}

export async function analyzeIssue(text: string): Promise<AnalyzeResult> {
  const res = await apiClient.post<AnalyzeResult>("/issues/analyze", { text });
  return res.data;
}

export async function createIssue(data: {
  title: string;
  description: string;
  category?: string;
  building?: string | null;
  room?: string | null;
  asset?: string | null;
  urgency?: string;
  embedding?: number[] | null;
  clusterId?: string | null;
}): Promise<Issue> {
  const res = await apiClient.post<Issue>("/issues", data);
  return res.data;
}

export async function getIssues(params?: {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  my?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ issues: Issue[]; pagination: any }> {
  const res = await apiClient.get<{ issues: Issue[]; pagination: any }>("/issues", { params });
  return res.data;
}

export async function getIssueById(id: string): Promise<any> {
  const res = await apiClient.get<any>(`/issues/${id}`);
  return res.data;
}

export async function markIssueAffected(id: string): Promise<any> {
  const res = await apiClient.post(`/issues/${id}/affected`);
  return res.data;
}

export async function toggleFollowIssue(id: string): Promise<{ following: boolean }> {
  const res = await apiClient.post<{ following: boolean }>(`/issues/${id}/follow`);
  return res.data;
}

export async function mergeIssue(id: string, targetIssueId: string): Promise<any> {
  const res = await apiClient.post(`/issues/${id}/merge`, { targetIssueId });
  return res.data;
}

export async function assignIssue(id: string, data: { departmentId?: string; assigneeId?: string }): Promise<any> {
  const res = await apiClient.patch(`/issues/${id}/assign`, data);
  return res.data;
}

export async function updateIssueStatus(id: string, status: string): Promise<any> {
  const res = await apiClient.patch(`/issues/${id}/status`, { status });
  return res.data;
}

export async function addComment(id: string, body: string): Promise<any> {
  const res = await apiClient.post(`/issues/${id}/comments`, { body });
  return res.data;
}

export async function confirmResolution(id: string): Promise<any> {
  const res = await apiClient.post(`/issues/${id}/confirm-resolution`);
  return res.data;
}
