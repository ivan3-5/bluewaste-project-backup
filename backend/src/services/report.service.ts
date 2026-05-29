import prisma from "../config/database";
import {
  ReportStatus,
  WasteCategory,
  Prisma,
  NotificationType,
  Role,
} from "@prisma/client";
import {
  getPaginationParams,
  buildPaginatedResponse,
} from "../utils/pagination";
import { NotificationService } from "./notification.service";
import { env } from "../config/env";

type Viewer = {
  id: string;
  role: string;
};

function toNonNegativeInt(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed);
    }
  }

  return fallback;
}

function toFiniteNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function toSafeJson(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeImageContentType(value: string | null) {
  const normalized = (value || "image/jpeg").split(";")[0].trim().toLowerCase();

  if (normalized === "image/jpg") {
    return "image/jpeg";
  }

  return normalized || "image/jpeg";
}

function decodeBase64ImageBuffer(value: unknown): Buffer | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const trimmed = value.trim();
  const commaIndex = trimmed.indexOf(",");
  const base64Payload =
    commaIndex >= 0 ? trimmed.slice(commaIndex + 1).trim() : trimmed;

  if (!base64Payload) {
    return null;
  }

  try {
    const buffer = Buffer.from(base64Payload, "base64");
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}

function extractDetectionLabels(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const labels = payload
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }

      const record = item as Record<string, unknown>;
      const raw =
        typeof record.class === "string"
          ? record.class
          : typeof record.class_name === "string"
            ? record.class_name
            : typeof record.label === "string"
              ? record.label
              : "";

      return raw.trim().toLowerCase();
    })
    .filter((label) => label.length > 0);

  return Array.from(new Set(labels));
}

export class ReportService {
  private static readonly GEO_CACHE_TTL_MS = 20_000;
  private static readonly SPAM_RETENTION_MS =
    env.SPAM_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  private static readonly SPAM_PURGE_INTERVAL_MS = 60 * 60 * 1000;
  private static lastSpamPurgeAt = 0;

  private static mapDataCache = new Map<
    string,
    {
      expiresAt: number;
      data: any[];
    }
  >();

  private static heatmapCache = new Map<
    string,
    {
      expiresAt: number;
      data: Array<{ lat: number; lng: number; intensity: number }>;
    }
  >();

  private static invalidateGeoCaches() {
    this.mapDataCache.clear();
    this.heatmapCache.clear();
  }

  private static getCachedMapData(cacheKey: string) {
    const cached = this.mapDataCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt < Date.now()) {
      this.mapDataCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  private static setCachedMapData(cacheKey: string, data: any[]) {
    this.mapDataCache.set(cacheKey, {
      expiresAt: Date.now() + this.GEO_CACHE_TTL_MS,
      data,
    });
  }

  private static getCachedHeatmapData(cacheKey: string) {
    const cached = this.heatmapCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt < Date.now()) {
      this.heatmapCache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  private static setCachedHeatmapData(
    cacheKey: string,
    data: Array<{ lat: number; lng: number; intensity: number }>,
  ) {
    this.heatmapCache.set(cacheKey, {
      expiresAt: Date.now() + this.GEO_CACHE_TTL_MS,
      data,
    });
  }

  private static async requestYoloAnalysis(imageUrl: string) {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch report image for analysis");
    }

    const contentType = normalizeImageContentType(
      imageResponse.headers.get("content-type"),
    );
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const yoloBody = new FormData();
    yoloBody.append(
      "image",
      new Blob([imageBuffer], { type: contentType }),
      "report-image.jpg",
    );
    yoloBody.append("return_annotated", "true");

    let yoloResponse: Response;
    try {
      yoloResponse = await fetch(env.YOLO_API_URL, {
        method: "POST",
        body: yoloBody,
      });
    } catch {
      throw new Error(
        "YOLO service is unavailable. Start the YOLO API service and verify YOLO_API_URL.",
      );
    }

    const yoloText = await yoloResponse.text();
    const yoloJson = toSafeJson(yoloText) ?? {};

    if (!yoloResponse.ok) {
      const message =
        (yoloJson as any)?.detail ||
        (yoloJson as any)?.message ||
        (yoloJson as any)?.error ||
        "YOLO API request failed";
      throw new Error(`YOLO API error: ${message}`);
    }

    const count = toNonNegativeInt((yoloJson as any)?.count, 0);
    const detections = Array.isArray((yoloJson as any)?.detections)
      ? (yoloJson as any).detections
      : [];
    const wasteCount = toNonNegativeInt(
      (yoloJson as any)?.waste_count,
      detections.length > 0 ? detections.length : count,
    );

    const annotatedImageBuffer = decodeBase64ImageBuffer(
      (yoloJson as any)?.annotated_image_base64,
    );
    let annotatedImageUpload: { url: string; publicId: string } | null = null;

    if (annotatedImageBuffer) {
      try {
        annotatedImageUpload = await (
          await import("../services/cloudinary.service")
        ).CloudinaryService.uploadImage(
          annotatedImageBuffer,
          "bluewaste/analysis",
        );
      } catch (error) {
        console.warn("Failed to upload annotated YOLO image:", error);
      }
    }

    const labels = Array.isArray((yoloJson as any)?.labels)
      ? (yoloJson as any).labels
          .filter(
            (label: unknown): label is string => typeof label === "string",
          )
          .map((label: string) => label.trim().toLowerCase())
          .filter((label: string) => label.length > 0)
      : extractDetectionLabels(detections);

    return {
      status:
        (yoloJson as any)?.status === "DIRTY"
          ? ("DIRTY" as const)
          : ("CLEAN" as const),
      wasteCount,
      count,
      confidence:
        toFiniteNumberOrNull((yoloJson as any)?.top_confidence) ??
        toFiniteNumberOrNull((yoloJson as any)?.confidence),
      labels,
      detections,
      inferenceMs: toFiniteNumberOrNull((yoloJson as any)?.inference_ms),
      annotatedImageUrl: annotatedImageUpload?.url ?? null,
      annotatedImagePublicId: annotatedImageUpload?.publicId ?? null,
    };
  }

  private static getSpamAutoDeleteAt(spamMarkedAt: Date) {
    return new Date(spamMarkedAt.getTime() + this.SPAM_RETENTION_MS);
  }

  private static async purgeExpiredSpamIfDue() {
    const now = Date.now();
    if (now - this.lastSpamPurgeAt < this.SPAM_PURGE_INTERVAL_MS) {
      return;
    }

    this.lastSpamPurgeAt = now;
    try {
      await this.purgeExpiredSpamReports();
    } catch (error) {
      console.warn("Failed background spam purge:", error);
    }
  }

  static async create(data: {
    title: string;
    description: string;
    category: WasteCategory;
    latitude: number;
    longitude: number;
    address?: string;
    barangayId?: string;
    isAnonymous?: boolean;
    reporterId?: string;
  }) {
    await this.purgeExpiredSpamIfDue();

    const report = await prisma.$transaction(async (tx) => {
      const created = await tx.report.create({
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
          barangayId: data.barangayId,
          isAnonymous: data.isAnonymous || false,
          reporterId: data.isAnonymous ? null : data.reporterId,
        },
        include: {
          reporter: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          barangay: { select: { id: true, name: true } },
          images: true,
        },
      });

      if (data.reporterId) {
        await tx.statusHistory.create({
          data: {
            reportId: created.id,
            newStatus: ReportStatus.PENDING,
            changedById: data.reporterId,
            notes: "Report submitted",
          },
        });
      }

      return created;
    });

    try {
      await NotificationService.notifyAdmins(
        "New Waste Report",
        `A new ${data.category.replace("_", " ").toLowerCase()} report has been submitted: "${data.title}"`,
        report.id,
      );
    } catch (error) {
      console.warn("Failed to notify admins for new report:", report.id, error);
    }

    this.invalidateGeoCaches();

    return report;
  }

  static async findById(id: string, viewer?: Viewer) {
    if (!viewer) {
      throw new Error("Insufficient permissions.");
    }

    const where: Prisma.ReportWhereInput = {
      id,
      isDeleted: false,
    };

    if (viewer.role === Role.FIELD_WORKER) {
      where.assignedToId = viewer.id;
    } else if (viewer.role === Role.CITIZEN) {
      where.reporterId = viewer.id;
    }

    const report = await prisma.report.findFirst({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        barangay: { select: { id: true, name: true } },
        images: { orderBy: { createdAt: "asc" } },
        statusHistory: {
          include: {
            changedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!report) {
      if (viewer.role === Role.FIELD_WORKER || viewer.role === Role.CITIZEN) {
        const exists = await prisma.report.findFirst({
          where: { id, isDeleted: false },
          select: { id: true },
        });
        if (exists) {
          throw new Error("Insufficient permissions.");
        }
      }

      throw new Error("Report not found");
    }

    return report;
  }

  static async updateStatus(
    reportId: string,
    status: ReportStatus,
    changedById: string,
    notes?: string,
  ) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, isDeleted: false, isSpam: false },
    });

    if (!report) {
      throw new Error("Report not found");
    }

    const [updatedReport] = await prisma.$transaction([
      prisma.report.update({
        where: { id: reportId },
        data: { status },
        include: {
          reporter: { select: { id: true, firstName: true, lastName: true } },
          barangay: { select: { id: true, name: true } },
          images: { take: 1 },
        },
      }),
      prisma.statusHistory.create({
        data: {
          reportId,
          previousStatus: report.status,
          newStatus: status,
          changedById,
          notes,
        },
      }),
    ]);

    // Notify report creator about status change (if not anonymous)
    if (report.reporterId) {
      await NotificationService.create({
        userId: report.reporterId,
        title: "Report Status Updated",
        message: `Your report "${report.title}" status changed to ${status.replace("_", " ")}`,
        type: "STATUS_CHANGE",
        reportId,
      });
    }

    // Notify admins when field worker marks report as cleaned
    if (status === ReportStatus.CLEANED) {
      const barangayInfo = updatedReport.barangay
        ? ` in ${updatedReport.barangay.name}`
        : "";
      const locationInfo = report.address
        ? ` (${report.address})`
        : barangayInfo;

      await NotificationService.notifyAdmins(
        "Report Completed",
        `Report "${updatedReport.title}" has been marked as cleaned${locationInfo}. Cleanup completed at ${new Date().toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })}.`,
        reportId,
        NotificationType.STATUS_CHANGE,
      );
    }

    this.invalidateGeoCaches();

    return updatedReport;
  }

  static async getMyReports(
    userId: string,
    filters: { page?: string; limit?: string; status?: ReportStatus },
  ) {
    await this.purgeExpiredSpamIfDue();
    const pagination = getPaginationParams({
      page: filters.page,
      limit: filters.limit,
    });

    const where: Prisma.ReportWhereInput = {
      reporterId: userId,
      isDeleted: false,
      isSpam: false,
    };
    if (filters.status) where.status = filters.status;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          barangay: { select: { id: true, name: true } },
          images: { take: 1 },
          _count: { select: { images: true, statusHistory: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.report.count({ where }),
    ]);

    return buildPaginatedResponse(reports, total, pagination);
  }

  static async getAssignedReports(
    userId: string,
    filters: { page?: string; limit?: string; status?: ReportStatus },
  ) {
    await this.purgeExpiredSpamIfDue();
    const pagination = getPaginationParams({
      page: filters.page,
      limit: filters.limit,
    });

    const where: Prisma.ReportWhereInput = {
      assignedToId: userId,
      isDeleted: false,
      isSpam: false,
    };
    if (filters.status) where.status = filters.status;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, firstName: true, lastName: true } },
          barangay: { select: { id: true, name: true } },
          images: { take: 1 },
          _count: { select: { images: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.report.count({ where }),
    ]);

    return buildPaginatedResponse(reports, total, pagination);
  }

  static async getMapData(
    filters?: {
      status?: ReportStatus;
      category?: WasteCategory;
      barangayId?: string;
      limit?: string;
    },
  ) {
    await this.purgeExpiredSpamIfDue();
    const parsedLimit = Number.parseInt(filters?.limit || "", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 5000)
      : 2000;

    const cacheKey = JSON.stringify({
      status: filters?.status || null,
      category: filters?.category || null,
      barangayId: filters?.barangayId || null,
      limit,
    });

    const cached = this.getCachedMapData(cacheKey);
    if (cached) {
      return cached;
    }

    const where: Prisma.ReportWhereInput = {
      isDeleted: false,
      isSpam: false,
    };
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.barangayId) where.barangayId = filters.barangayId;

    const reports = await prisma.report.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        latitude: true,
        longitude: true,
        address: true,
        createdAt: true,
        barangay: { select: { id: true, name: true } },
        images: { take: 1, select: { imageUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    this.setCachedMapData(cacheKey, reports);

    return reports;
  }

  static async getHeatmapData(filters?: { limit?: string }) {
    await this.purgeExpiredSpamIfDue();

    const cacheKey = JSON.stringify({
      limit: filters?.limit || null,
    });

    const cached = this.getCachedHeatmapData(cacheKey);
    if (cached) {
      return cached;
    }

    const parsedLimit = Number.parseInt(filters?.limit || "", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 10000)
      : 5000;

    const reports = await prisma.report.findMany({
      where: {
        isDeleted: false,
        isSpam: false,
        status: { not: ReportStatus.CLEANED },
      },
      select: {
        latitude: true,
        longitude: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const heatmapData = reports.map((r) => ({
      lat: r.latitude,
      lng: r.longitude,
      intensity: 0.5,
    }));

    this.setCachedHeatmapData(cacheKey, heatmapData);

    return heatmapData;
  }

  static async purgeExpiredSpamReports() {
    const cutoff = new Date(Date.now() - this.SPAM_RETENTION_MS);

    const result = await prisma.report.updateMany({
      where: {
        isDeleted: false,
        isSpam: true,
        spamMarkedAt: {
          not: null,
          lte: cutoff,
        },
      },
      data: {
        isDeleted: true,
      },
    });

    if (result.count > 0) {
      this.invalidateGeoCaches();
    }

    return result.count;
  }

  static async softDelete(reportId: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Report not found");

    const deletedReport = await prisma.report.update({
      where: { id: reportId },
      data: { isDeleted: true },
    });

    this.invalidateGeoCaches();

    return deletedReport;
  }
}