import { Request, Response } from "express";
import { AnalyticsService } from "../services/analytics.service";

export class AnalyticsController {
  static async getOverview(req: Request, res: Response) {
    try {
      const overview = await AnalyticsService.getOverview();
      res.json(overview);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics overview" });
    }
  }

  static async getTrends(req: Request, res: Response) {
    try {
      const period =
        (req.query.period as "daily" | "weekly" | "monthly") || "daily";
      const days = parseInt(req.query.days as string) || 30;
      const trends = await AnalyticsService.getTrends(period, days);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trends" });
    }
  }

  static async getCategoryDistribution(req: Request, res: Response) {
    try {
      const distribution = await AnalyticsService.getCategoryDistribution();
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category distribution" });
    }
  }

  static async getBarangayStats(req: Request, res: Response) {
    try {
      const stats = await AnalyticsService.getBarangayStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch barangay stats" });
    }
  }

  static async exportData(req: Request, res: Response) {
    try {
      const data = await AnalyticsService.exportData(req.query as any);

      // Convert to CSV
      const headers = [
        "ID",
        "Title",
        "Description",
        "Category",
        "Status",
        "Latitude",
        "Longitude",
        "Address",
        "Barangay",
        "Reporter",
        "Assigned To",
        "Created At",
      ];

      const rows = data.map((r) => [
        r.id,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.description.replace(/"/g, '""')}"`,
        r.category,
        r.status,
        r.latitude,
        r.longitude,
        `"${(r.address || "").replace(/"/g, '""')}"`,
        r.barangay?.name || "",
        r.reporter
          ? `${r.reporter.firstName} ${r.reporter.lastName}`
          : "Anonymous",
        r.assignedTo
          ? `${r.assignedTo.firstName} ${r.assignedTo.lastName}`
          : "",
        r.createdAt.toISOString(),
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=bluewaste-reports.csv",
      );
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  }
}
