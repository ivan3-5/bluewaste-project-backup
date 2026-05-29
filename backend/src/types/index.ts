import {
  Role,
  ReportStatus,
  WasteCategory,
  NotificationType,
  ImageType,
} from "@prisma/client";

export { Role, ReportStatus, WasteCategory, NotificationType, ImageType };

export interface UserPayload {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}

export interface CreateReportInput {
  title: string;
  description: string;
  category: WasteCategory;
  latitude: number;
  longitude: number;
  address?: string;
  isAnonymous?: boolean;
}

export interface UpdateStatusInput {
  status: ReportStatus;
  notes?: string;
}

export interface AssignWorkerInput {
  assignedToId: string;
}

export interface ReportFilters {
  status?: ReportStatus;
  category?: WasteCategory;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AnalyticsPeriod {
  period: "daily" | "weekly" | "monthly";
  startDate?: string;
  endDate?: string;
}
