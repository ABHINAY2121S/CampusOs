import { apiClient } from "./client";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "faculty" | "hod" | "admin" | "technician";
  department?: string | null;
  departmentId?: string | null;
  studentId?: string | null;
  year?: string | null;
  division?: string | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", { email, password });
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await apiClient.get<User>("/auth/me");
  return response.data;
}
