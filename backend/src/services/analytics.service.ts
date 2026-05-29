import prisma from "../config/database";
import { ReportStatus } from "@prisma/client";

export class AnalyticsService {
  static async getBarangayStats() {
    // Barangay model removed; return empty stats.
    return [] as Array<unknown>;
  }

  static async getBarangayDetailedStats(id: string) {
    throw new Error("Barangay analytics removed");
  }
}