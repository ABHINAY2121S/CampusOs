import { apiClient } from "./client";

export interface AdminOverviewStats {
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  criticalIssues: number;
  activeTechnicians: number;
  avgResolutionHours: number;
  slaBreaches: number;
  resolutionRate: number;
}

export interface BuildingHeatmapItem {
  building: string;
  total: number;
  critical: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percent: number;
}

export interface DepartmentPerformance {
  id: string;
  name: string;
  code: string;
  total: number;
  open: number;
  resolved: number;
  critical: number;
  slaMetPercent: number;
}

export async function getAdminOverview(): Promise<AdminOverviewStats> {
  const res = await apiClient.get<AdminOverviewStats>("/admin/overview");
  return res.data;
}

export async function getBuildingHeatmap(): Promise<BuildingHeatmapItem[]> {
  const res = await apiClient.get<BuildingHeatmapItem[]>("/admin/heatmap");
  return res.data;
}

export async function getCategoriesDistribution(): Promise<CategoryDistribution[]> {
  const res = await apiClient.get<CategoryDistribution[]>("/admin/categories");
  return res.data;
}

export async function getDepartmentsPerformance(): Promise<DepartmentPerformance[]> {
  const res = await apiClient.get<DepartmentPerformance[]>("/admin/departments/performance");
  return res.data;
}

export async function getNeedsAttention(): Promise<any[]> {
  const res = await apiClient.get<any[]>("/admin/needs-attention");
  return res.data;
}

export async function getTechnicians(): Promise<any[]> {
  const res = await apiClient.get<any[]>("/admin/technicians");
  return res.data;
}
