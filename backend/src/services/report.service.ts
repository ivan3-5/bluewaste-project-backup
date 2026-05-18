import prisma from "../config/database";
import {
  AnalysisStatus,
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
import { CloudinaryService } from "./cloudinary.service";
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

function normalizeDecisionStatus(value: unknown): AnalysisStatus {
  if (typeof value === "string" && value.trim().toUpperCase() === "DIRTY") {
    return AnalysisStatus.DIRTY;
  }

  return AnalysisStatus.CLEAN;
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
  private static readonly RESORT_ADMIN_NEW_REPORT_TITLE = "New Area Report";
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

  private static getViewerScopeKey(viewer?: Viewer) {
    if (!viewer) {
      return "public";
    }
    if (viewer.role === Role.RESORT_ADMIN) {
      return `resort-admin:${viewer.id}`;
    }
    return viewer.role;
  }

  private static getViewerWhereScope(viewer?: Viewer): Prisma.ReportWhereInput {
    if (!viewer || viewer.role !== Role.RESORT_ADMIN) {
      return {};
    }

    return {
      resortArea: {
        is: {
          ownerId: viewer.id,
        },
      },
    };
  }

  private static getReportDetailWhere(viewer: Viewer, reportId: string) {
    if (viewer.role === Role.LGU_ADMIN) {
      return {
        id: reportId,
        isDeleted: false,
      } satisfies Prisma.ReportWhereInput;
    }

    if (viewer.role === Role.RESORT_ADMIN) {
      return {
        id: reportId,
        isDeleted: false,
        ...this.getViewerWhereScope(viewer),
      } satisfies Prisma.ReportWhereInput;
    }

    if (viewer.role === Role.FIELD_WORKER) {
      return {
        id: reportId,
        isDeleted: false,
        assignedToId: viewer.id,
      } satisfies Prisma.ReportWhereInput;
    }

    return {
      id: "__forbidden__",
      isDeleted: false,
    };
  }

  private static async findMatchingResortArea(
    latitude: number,
    longitude: number,
  ) {
    const matched = await prisma.resortArea.findFirst({
      where: {
        isActive: true,
        minLat: { lte: latitude },
        maxLat: { gte: latitude },
        minLng: { lte: longitude },
        maxLng: { gte: longitude },
        owner: {
          role: Role.RESORT_ADMIN,
          isActive: true,
        },
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return matched;
  }

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
        annotatedImageUpload = await CloudinaryService.uploadImage(
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
      status: normalizeDecisionStatus((yoloJson as any)?.status),
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
    const matchedResortArea = await this.findMatchingResortArea(
      data.latitude,
      data.longitude,
    );

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
          resortAreaId: matchedResortArea?.id,
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

      if (matchedResortArea?.ownerId) {
        await NotificationService.create({
          userId: matchedResortArea.ownerId,
          title: this.RESORT_ADMIN_NEW_REPORT_TITLE,
          message: `A new report is inside ${matchedResortArea.name}: "${data.title}"`,
          type: NotificationType.NEW_REPORT,
          reportId: report.id,
        });
      }
    } catch (error) {
      console.warn("Failed to notify admins for new report:", report.id, error);
    }

    this.invalidateGeoCaches();

    return report;
  }

  static async findAll(
    filters: {
      status?: ReportStatus;
      category?: WasteCategory;
      barangayId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      isSpam?: string;
      page?: string;
      limit?: string;
    },
    viewer?: Viewer,
  ) {
    await this.purgeExpiredSpamIfDue();
    const pagination = getPaginationParams({
      page: filters.page,
      limit: filters.limit,
    });

    const wantsSpam =
      filters.isSpam === "true" && viewer?.role === Role.LGU_ADMIN;

    const where: Prisma.ReportWhereInput = {
      isDeleted: false,
      isSpam: wantsSpam,
      ...this.getViewerWhereScope(viewer),
    };

    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.barangayId) where.barangayId = filters.barangayId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { address: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, firstName: true, lastName: true },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
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

  static async findById(id: string, viewer?: Viewer) {
    if (!viewer) {
      throw new Error("Insufficient permissions.");
    }

    const report = await prisma.report.findFirst({
      where: this.getReportDetailWhere(viewer, id),
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
      if (
        viewer.role === Role.RESORT_ADMIN ||
        viewer.role === Role.FIELD_WORKER
      ) {
        const exists = await prisma.report.findFirst({
          where: { id, isDeleted: false },
          select: { id: true },
        });
        if (exists) {
          throw new Error("Insufficient permissions.");
        }
      }

      if (viewer.role === Role.CITIZEN) {
        throw new Error("Insufficient permissions.");
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

  static async assignWorker(
    reportId: string,
    assignedToId: string,
    assignedById: string,
  ) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, isDeleted: false, isSpam: false },
    });

    if (!report) {
      throw new Error("Report not found");
    }

    // Verify worker exists and is a field worker
    const worker = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (!worker || worker.role !== "FIELD_WORKER") {
      throw new Error("Invalid field worker");
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: { assignedToId },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        barangay: { select: { id: true, name: true } },
      },
    });

    // Notify assigned worker
    await NotificationService.create({
      userId: assignedToId,
      title: "New Assignment",
      message: `You have been assigned to report: "${report.title}"`,
      type: "ASSIGNMENT",
      reportId,
    });

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
    viewer?: Viewer,
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
      scope: this.getViewerScopeKey(viewer),
    });

    const cached = this.getCachedMapData(cacheKey);
    if (cached) {
      return cached;
    }

    const where: Prisma.ReportWhereInput = {
      isDeleted: false,
      isSpam: false,
      ...this.getViewerWhereScope(viewer),
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

  static async getHeatmapData(filters?: { limit?: string }, viewer?: Viewer) {
    await this.purgeExpiredSpamIfDue();

    const cacheKey = JSON.stringify({
      limit: filters?.limit || null,
      scope: this.getViewerScopeKey(viewer),
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
        ...this.getViewerWhereScope(viewer),
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

  static async analyzeReportImage(
    reportId: string,
    changedById: string,
    imageId?: string,
  ) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, isDeleted: false },
      include: {
        images: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!report) {
      throw new Error("Report not found");
    }

    const reportImages = report.images.filter(
      (image) => image.type === "REPORT",
    );
    const targetImage = imageId
      ? reportImages.find((image) => image.id === imageId)
      : reportImages[0];

    if (!targetImage) {
      throw new Error("No report image found");
    }

    const analysis = await this.requestYoloAnalysis(targetImage.imageUrl);

    const now = new Date();
    const shouldMarkSpam = analysis.status === AnalysisStatus.CLEAN;
    const nextStatus = shouldMarkSpam
      ? ReportStatus.REJECTED
      : report.status === ReportStatus.PENDING ||
          report.status === ReportStatus.REJECTED
        ? ReportStatus.VERIFIED
        : report.status;

    const spamReason = shouldMarkSpam
      ? "No waste detected by image analysis."
      : null;

    const notes = shouldMarkSpam
      ? "Admin image analysis: CLEAN. Sent to spam and scheduled for auto-delete in 3 days."
      : "Admin image analysis: DIRTY. Report validated and kept in active queue.";

    const [updatedReport] = await prisma.$transaction([
      prisma.report.update({
        where: { id: reportId },
        data: {
          isSpam: shouldMarkSpam,
          spamMarkedAt: shouldMarkSpam ? now : null,
          spamReason,
          analysisStatus: analysis.status,
          analysisWasteCount: analysis.wasteCount,
          analysisConfidence: analysis.confidence,
          analyzedAt: now,
          status: nextStatus,
        },
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
      }),
      ...(report.status !== nextStatus
        ? [
            prisma.statusHistory.create({
              data: {
                reportId,
                previousStatus: report.status,
                newStatus: nextStatus,
                changedById,
                notes,
              },
            }),
          ]
        : []),
    ]);

    this.invalidateGeoCaches();

    return {
      report: updatedReport,
      analysis: {
        status: analysis.status,
        wasteCount: analysis.wasteCount,
        count: analysis.count,
        confidence: analysis.confidence,
        labels: analysis.labels,
        detections: analysis.detections,
        inferenceMs: analysis.inferenceMs,
        imageId: targetImage.id,
        imageUrl: targetImage.imageUrl,
        annotatedImageUrl: analysis.annotatedImageUrl,
        annotatedImagePublicId: analysis.annotatedImagePublicId,
        spam: shouldMarkSpam,
        spamMarkedAt: shouldMarkSpam ? now : null,
        autoDeleteAt: shouldMarkSpam ? this.getSpamAutoDeleteAt(now) : null,
      },
    };
  }

  static async getSpamReports(
    filters: {
      status?: ReportStatus;
      category?: WasteCategory;
      barangayId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: string;
      limit?: string;
    },
    viewer?: Viewer,
  ) {
    return this.findAll({ ...filters, isSpam: "true" }, viewer);
  }

  static async restoreFromSpam(reportId: string, changedById: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, isDeleted: false, isSpam: true },
    });

    if (!report) {
      throw new Error("Spam report not found");
    }

    const nextStatus =
      report.status === ReportStatus.REJECTED
        ? ReportStatus.PENDING
        : report.status;

    const [updatedReport] = await prisma.$transaction([
      prisma.report.update({
        where: { id: reportId },
        data: {
          isSpam: false,
          spamMarkedAt: null,
          spamReason: null,
          status: nextStatus,
        },
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
      }),
      ...(report.status !== nextStatus
        ? [
            prisma.statusHistory.create({
              data: {
                reportId,
                previousStatus: report.status,
                newStatus: nextStatus,
                changedById,
                notes: "Restored from spam queue by admin.",
              },
            }),
          ]
        : []),
    ]);

    this.invalidateGeoCaches();

    return updatedReport;
  }

  static async deleteSpamReport(reportId: string) {
    const report = await prisma.report.findFirst({
      where: { id: reportId, isDeleted: false, isSpam: true },
    });

    if (!report) {
      throw new Error("Spam report not found");
    }

    const deletedReport = await prisma.report.update({
      where: { id: reportId },
      data: { isDeleted: true },
    });

    this.invalidateGeoCaches();

    return deletedReport;
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
