export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "CITIZEN" | "LGU_ADMIN" | "FIELD_WORKER";
  phone?: string;
  avatarUrl?: string;
  barangayId?: string;
  barangay?: Barangay;
  createdAt: string;
  updatedAt?: string;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: WasteCategory;
  status: ReportStatus;
  priority?: ReportPriority;
  latitude: number;
  longitude: number;
  address?: string;
  isAnonymous: boolean;
  isSpam?: boolean;
  spamMarkedAt?: string | null;
  spamReason?: string | null;
  analysisStatus?: "DIRTY" | "CLEAN" | null;
  analysisWasteCount?: number | null;
  analysisConfidence?: number | null;
  analyzedAt?: string | null;
  reporterId?: string;
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  assignedToId?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  barangayId?: string;
  barangay?: { id: string; name: string };
  images: ReportImage[];
  statusHistory?: StatusHistory[];
  _count?: { images: number; statusHistory?: number };
  createdAt: string;
  updatedAt: string;
}

export type AiWasteType = "RECYCLABLE" | "NON_RECYCLABLE" | "ORGANIC";

export interface WasteReport {
  id: string;
  imageUrl: string;
  detectedObject: string;
  wasteType: AiWasteType;
  confidence: number;
  labels: string[];
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportImage {
  id: string;
  imageUrl: string;
  publicId: string;
  type: "REPORT" | "CLEANUP";
  createdAt: string;
}

export interface StatusHistory {
  id: string;
  previousStatus?: ReportStatus;
  newStatus: ReportStatus;
  notes?: string;
  changedBy?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface Barangay {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  _count?: { reports: number };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "NEW_REPORT" | "STATUS_CHANGE" | "ASSIGNMENT" | "SYSTEM";
  isRead: boolean;
  reportId?: string;
  report?: { id: string; title: string; status: string };
  createdAt: string;
}

export interface MapReport {
  id: string;
  title: string;
  category: WasteCategory;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  address?: string;
  createdAt: string;
  barangay?: { id: string; name: string };
  images: { imageUrl: string }[];
}

export interface ResortArea {
  id: string;
  name: string;
  description?: string | null;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  isActive: boolean;
  ownerId: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    reports: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ZonePoint {
  lat: number;
  lng: number;
}

export interface ReportingZone {
  id: string;
  name: string;
  coordinates: ZonePoint[];
  isActive: boolean;
  createdAt: string;
  createdBy?: { id: string; firstName: string; lastName: string };
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface AnalyticsOverview {
  total: number;
  pending: number;
  verified: number;
  cleanupScheduled: number;
  inProgress: number;
  cleaned: number;
  rejected: number;
}

export interface TrendData {
  date: string;
  count: number;
}

export interface CategoryData {
  category: WasteCategory;
  count: number;
}

export interface BarangayStats {
  barangayId: string;
  barangayName: string;
  count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type WasteCategory =
  | "PLASTIC_WASTE"
  | "ORGANIC_WASTE"
  | "GLASS_WASTE"
  | "METAL_WASTE"
  | "PAPER_WASTE";
export type ReportStatus =
  | "PENDING"
  | "VERIFIED"
  | "CLEANUP_SCHEDULED"
  | "IN_PROGRESS"
  | "CLEANED"
  | "REJECTED";

export type ReportPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const WASTE_CATEGORY_LABELS: Record<WasteCategory, string> = {
  PLASTIC_WASTE: "Plastic Waste",
  ORGANIC_WASTE: "Organic Waste",
  GLASS_WASTE: "Glass Waste",
  METAL_WASTE: "Metal Waste",
  PAPER_WASTE: "Paper Waste",
};

export const WASTE_CATEGORY_COLORS: Record<WasteCategory, string> = {
  PLASTIC_WASTE: "#3b82f6",
  ORGANIC_WASTE: "#84cc16",
  GLASS_WASTE: "#06b6d4",
  METAL_WASTE: "#f97316",
  PAPER_WASTE: "#8b5cf6",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  CLEANUP_SCHEDULED: "Cleanup Scheduled",
  IN_PROGRESS: "In Progress",
  CLEANED: "Cleaned",
  REJECTED: "Rejected",
};

export const PRIORITY_LABELS: Record<ReportPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
  PENDING: "#f59e0b",
  VERIFIED: "#3b82f6",
  CLEANUP_SCHEDULED: "#8b5cf6",
  IN_PROGRESS: "#f97316",
  CLEANED: "#22c55e",
  REJECTED: "#ef4444",
};
