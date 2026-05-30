import { Request, Response } from "express";
import { AnalyticsService } from "../services/analytics.service";
import { sendError } from "../utils/http";

export class AnalyticsController {
  static async getDashboardOverview(req: Request, res: Response) {
    try {
      const daysRaw = req.query.days;
      const parsedDays = Number.parseInt(String(daysRaw || ""), 10);
      const days = Number.isFinite(parsedDays) ? parsedDays : undefined;
      const result = await AnalyticsService.getDashboardOverview(days);
      res.setHeader("Cache-Control", "private, max-age=15");
      res.json(result);
    } catch (error: any) {
      sendError(
        res,
        500,
        "Failed to fetch dashboard analytics",
        "ANALYTICS_DASHBOARD_FAILED",
      );
    }
  }
}
