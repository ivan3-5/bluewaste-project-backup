import prisma from "../config/database";
import { ReportStatus, WasteCategory } from "@prisma/client";

const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

type TrendRow = { date: Date; count: number };

export class AnalyticsService {
  static async getDashboardOverview(daysInput?: number) {
    const days = Number.isFinite(daysInput)
      ? Math.min(Math.max(daysInput as number, 1), MAX_DAYS)
      : DEFAULT_DAYS;

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const baseWhere = {
      isDeleted: false,
      isSpam: false,
    };

    const previousStart = new Date(startDate);
    previousStart.setDate(startDate.getDate() - days);

    const [statusGroups, categoryGroups, total, trendRows, previousCount] =
      await Promise.all([
        prisma.report.groupBy({
          by: ["status"],
          where: baseWhere,
          _count: { _all: true },
        }),
        prisma.report.groupBy({
          by: ["category"],
          where: baseWhere,
          _count: { _all: true },
        }),
        prisma.report.count({ where: baseWhere }),
        prisma.$queryRaw<TrendRow[]>`
          SELECT date_trunc('day', "createdAt") AS date,
                 COUNT(*)::int AS count
          FROM "Report"
          WHERE "isDeleted" = false
            AND "isSpam" = false
            AND "createdAt" >= ${startDate}
          GROUP BY date
          ORDER BY date ASC;
        `,
        prisma.report.count({
          where: {
            ...baseWhere,
            createdAt: {
              gte: previousStart,
              lt: startDate,
            },
          },
        }),
      ]);

    const statusCounts = new Map<ReportStatus, number>();
    statusGroups.forEach((group) => {
      statusCounts.set(group.status, Number(group._count._all));
    });

    const categoryCounts = new Map<WasteCategory, number>();
    categoryGroups.forEach((group) => {
      categoryCounts.set(group.category, Number(group._count._all));
    });

    const trendMap = new Map<string, number>();
    trendRows.forEach((row) => {
      const key = new Date(row.date).toISOString().slice(0, 10);
      trendMap.set(key, Number(row.count));
    });

    const trends = [] as Array<{ date: string; count: number }>;
    for (let i = 0; i < days; i += 1) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      trends.push({ date: key, count: trendMap.get(key) ?? 0 });
    }

    const currentCount = trends.reduce((sum, item) => sum + item.count, 0);
    let trendChange = 0;
    if (previousCount === 0) {
      trendChange = currentCount > 0 ? 100 : 0;
    } else {
      trendChange = ((currentCount - previousCount) / previousCount) * 100;
    }

    const overview = {
      total,
      pending: statusCounts.get(ReportStatus.PENDING) ?? 0,
      verified: statusCounts.get(ReportStatus.VERIFIED) ?? 0,
      cleanupScheduled: statusCounts.get(ReportStatus.CLEANUP_SCHEDULED) ?? 0,
      inProgress: statusCounts.get(ReportStatus.IN_PROGRESS) ?? 0,
      cleaned: statusCounts.get(ReportStatus.CLEANED) ?? 0,
      rejected: statusCounts.get(ReportStatus.REJECTED) ?? 0,
    };

    const categories = Array.from(categoryCounts.entries()).map(
      ([category, count]) => ({
        category,
        count,
      }),
    );

    return {
      overview,
      trends,
      categories,
      trendChange: Math.round(trendChange * 10) / 10,
      periodDays: days,
    };
  }

  static async getBarangayStats() {
    // Barangay model removed; return empty stats.
    return [] as Array<unknown>;
  }

  static async getBarangayDetailedStats(id: string) {
    throw new Error("Barangay analytics removed");
  }
}
