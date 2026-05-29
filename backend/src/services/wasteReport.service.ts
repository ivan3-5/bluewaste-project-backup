import prisma from "../config/database";
import { Prisma, WasteType } from "@prisma/client";
import {
  getPaginationParams,
  buildPaginatedResponse,
} from "../utils/pagination";

type WasteDetection = {
  type: WasteType;
  confidence: number;
  bbox: number[];
};

type WasteSeverity = "low" | "medium" | "high";

function toSeverity(totalItems: number): WasteSeverity {
  if (totalItems >= 7) return "high";
  if (totalItems >= 3) return "medium";
  return "low";
}

function getDominantWaste(detections: WasteDetection[]): WasteType | null {
  if (detections.length === 0) return null;

  const counts = new Map<WasteType, { count: number; maxConfidence: number }>();

  for (const detection of detections) {
    const current = counts.get(detection.type) ?? {
      count: 0,
      maxConfidence: 0,
    };
    counts.set(detection.type, {
      count: current.count + 1,
      maxConfidence: Math.max(current.maxConfidence, detection.confidence),
    });
  }

  let dominant: WasteType | null = null;
  let bestCount = -1;
  let bestConfidence = -1;

  for (const [type, stats] of counts.entries()) {
    if (
      stats.count > bestCount ||
      (stats.count === bestCount && stats.maxConfidence > bestConfidence)
    ) {
      dominant = type;
      bestCount = stats.count;
      bestConfidence = stats.maxConfidence;
    }
  }

  return dominant;
}

function getTopConfidence(detections: WasteDetection[]): number {
  if (detections.length === 0) return 0;
  return detections.reduce(
    (maxConfidence, detection) => Math.max(maxConfidence, detection.confidence),
    0,
  );
}

export class WasteReportService {
  static async create(data: {
    imageUrl: string;
    detectedObject: string;
    detections: WasteDetection[];
    labels: string[];
    latitude?: number;
    longitude?: number;
    address?: string;
    reporterId?: string;
  }) {
    const detections = data.detections ?? [];
    const totalItems = detections.length;
    const dominantWaste = getDominantWaste(detections);
    const severity = toSeverity(totalItems);
    const confidence = Number(getTopConfidence(detections).toFixed(4));

    return prisma.wasteReport.create({
      data: {
        imageUrl: data.imageUrl,
        detectedObject: data.detectedObject,
        detections,
        dominantWaste,
        totalItems,
        severity,
        confidence,
        labels: data.labels,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        reporterId: data.reporterId,
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  static async getMyReports(
    userId: string,
    filters: {
      page?: string;
      limit?: string;
    },
  ) {
    const pagination = getPaginationParams({
      page: filters.page,
      limit: filters.limit,
    });

    const where: Prisma.WasteReportWhereInput = { reporterId: userId };

    const [reports, total] = await Promise.all([
      prisma.wasteReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.wasteReport.count({ where }),
    ]);

    return buildPaginatedResponse(reports, total, pagination);
  }
}
