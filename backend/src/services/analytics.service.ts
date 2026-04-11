import prisma from "../config/database";
import { ReportStatus, Prisma } from "@prisma/client";

export class AnalyticsService {
  static async getOverview() {
    const [total, groupedByStatus] = await Promise.all([
      prisma.report.count({ where: { isDeleted: false, isSpam: false } }),
      prisma.report.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { isDeleted: false, isSpam: false },
      }),
    ]);

    const statusCounts = groupedByStatus.reduce(
      (acc, row) => {
        acc[row.status] = row._count.id;
        return acc;
      },
      {} as Record<ReportStatus, number>,
    );

    return {
      total,
      pending: statusCounts[ReportStatus.PENDING] || 0,
      verified: statusCounts[ReportStatus.VERIFIED] || 0,
      cleanupScheduled: statusCounts[ReportStatus.CLEANUP_SCHEDULED] || 0,
      inProgress: statusCounts[ReportStatus.IN_PROGRESS] || 0,
      cleaned: statusCounts[ReportStatus.CLEANED] || 0,
      rejected: statusCounts[ReportStatus.REJECTED] || 0,
    };
  }

  static async getTrends(
    period: "daily" | "weekly" | "monthly" = "daily",
    days: number = 30,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const truncateUnit =
      period === "weekly" ? "week" : period === "monthly" ? "month" : "day";

    const rows = await prisma.$queryRaw<Array<{ bucket: Date; count: number }>>(
      Prisma.sql`
        SELECT date_trunc(${truncateUnit}::text, "createdAt") AS bucket,
               COUNT(*)::int AS count
        FROM "Report"
        WHERE "isDeleted" = false
          AND "isSpam" = false
          AND "createdAt" >= ${startDate}
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
    );

    return rows.map((row) => {
      const bucketDate = new Date(row.bucket);

      if (period === "monthly") {
        return {
          date: `${bucketDate.getUTCFullYear()}-${String(bucketDate.getUTCMonth() + 1).padStart(2, "0")}`,
          count: row.count,
        };
      }

      return {
        date: bucketDate.toISOString().split("T")[0],
        count: row.count,
      };
    });
  }

  static async getCategoryDistribution() {
    const categories = await prisma.report.groupBy({
      by: ["category"],
      _count: { id: true },
      where: { isDeleted: false, isSpam: false },
      orderBy: { _count: { id: "desc" } },
    });

    return categories.map((c) => ({
      category: c.category,
      count: c._count.id,
    }));
  }

  static async getBarangayStats() {
    const rows = await prisma.$queryRaw<
      Array<{ barangayId: string; barangayName: string | null; count: number }>
    >(Prisma.sql`
      SELECT r."barangayId" AS "barangayId",
             b."name" AS "barangayName",
             COUNT(*)::int AS count
      FROM "Report" r
      LEFT JOIN "Barangay" b ON b."id" = r."barangayId"
      WHERE r."isDeleted" = false
        AND r."isSpam" = false
        AND r."barangayId" IS NOT NULL
      GROUP BY r."barangayId", b."name"
      ORDER BY count DESC
    `);

    return rows.map((row) => ({
      barangayId: row.barangayId,
      barangayName: row.barangayName || "Unknown",
      count: row.count,
    }));
  }

  static async getBarangayDetailedStats(barangayId: string) {
    const [total, byStatus, byCategory] = await Promise.all([
      prisma.report.count({
        where: { barangayId, isDeleted: false, isSpam: false },
      }),
      prisma.report.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { barangayId, isDeleted: false, isSpam: false },
      }),
      prisma.report.groupBy({
        by: ["category"],
        _count: { id: true },
        where: { barangayId, isDeleted: false, isSpam: false },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
    };
  }

  static async exportData(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    barangayId?: string;
  }) {
    const where: Prisma.ReportWhereInput = { isDeleted: false, isSpam: false };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (filters?.status) where.status = filters.status as ReportStatus;
    if (filters?.barangayId) where.barangayId = filters.barangayId;

    return prisma.report.findMany({
      where,
      include: {
        reporter: { select: { firstName: true, lastName: true, email: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        barangay: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
