import prisma from "../config/database";
import { ReportStatus } from "@prisma/client";

export class AnalyticsService {
  static async getBarangayStats() {
    const barangays = await prisma.barangay.findMany({
      include: {
        _count: {
          select: { reports: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const stats = await Promise.all(
      barangays.map(async (barangay) => {
        const [pendingCount, resolvedCount, assignedFieldWorkers] =
          await Promise.all([
            prisma.report.count({
              where: {
                barangayId: barangay.id,
                status: { in: [ReportStatus.PENDING, ReportStatus.VERIFIED] },
              },
            }),
            prisma.report.count({
              where: {
                barangayId: barangay.id,
                status: ReportStatus.CLEANED,
              },
            }),
            prisma.user.count({
              where: {
                barangayId: barangay.id,
                role: "FIELD_WORKER",
                isActive: true,
              },
            }),
          ]);

        return {
          id: barangay.id,
          name: barangay.name,
          latitude: barangay.latitude,
          longitude: barangay.longitude,
          totalReports: barangay._count.reports,
          pendingReports: pendingCount,
          resolvedReports: resolvedCount,
          fieldWorkers: assignedFieldWorkers,
        };
      }),
    );

    return stats;
  }

  static async getBarangayDetailedStats(id: string) {
    const barangay = await prisma.barangay.findUnique({
      where: { id },
    });

    if (!barangay) {
      throw new Error("Barangay not found");
    }

    const [
      totalReports,
      pendingReports,
      inProgressReports,
      resolvedReports,
      totalFieldWorkers,
      recentReports,
      categoryBreakdown,
    ] = await Promise.all([
      prisma.report.count({ where: { barangayId: id } }),
      prisma.report.count({
        where: {
          barangayId: id,
          status: ReportStatus.PENDING,
        },
      }),
      prisma.report.count({
        where: {
          barangayId: id,
          status: ReportStatus.IN_PROGRESS,
        },
      }),
      prisma.report.count({
        where: {
          barangayId: id,
          status: ReportStatus.CLEANED,
        },
      }),
      prisma.user.count({
        where: { barangayId: id, role: "FIELD_WORKER", isActive: true },
      }),
      prisma.report.findMany({
        where: { barangayId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          createdAt: true,
        },
      }),
      prisma.report.groupBy({
        by: ["category"],
        where: { barangayId: id },
        _count: { id: true },
      }),
    ]);

    return {
      totalReports,
      pendingReports,
      inProgressReports,
      resolvedReports,
      totalFieldWorkers,
      recentReports,
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
    };
  }
}