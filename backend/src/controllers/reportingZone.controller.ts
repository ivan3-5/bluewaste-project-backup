import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { sendError } from "../utils/http";
import { ReportingZoneService } from "../services/reportingZone.service";

export class ReportingZoneController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const activeOnly = req.query.all !== "true";
      const zones = await ReportingZoneService.list(activeOnly);
      res.json(zones);
    } catch {
      sendError(
        res,
        500,
        "Failed to fetch reporting zones",
        "ZONE_FETCH_FAILED",
      );
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const zone = await ReportingZoneService.create({
        ...req.body,
        createdById: req.user!.id,
      });
      res.status(201).json(zone);
    } catch (error: any) {
      if (
        error.message === "Zone name is required" ||
        error.message?.startsWith("A zone needs")
      ) {
        return sendError(res, 400, error.message, "ZONE_VALIDATION_FAILED");
      }
      sendError(
        res,
        500,
        "Failed to create reporting zone",
        "ZONE_CREATE_FAILED",
      );
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const zone = await ReportingZoneService.update(req.params.id, req.body);
      res.json(zone);
    } catch (error: any) {
      if (error.message === "Reporting zone not found") {
        return sendError(res, 404, error.message, "ZONE_NOT_FOUND");
      }
      if (error.message?.startsWith("A zone needs")) {
        return sendError(res, 400, error.message, "ZONE_VALIDATION_FAILED");
      }
      sendError(
        res,
        500,
        "Failed to update reporting zone",
        "ZONE_UPDATE_FAILED",
      );
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      await ReportingZoneService.delete(req.params.id);
      res.json({ message: "Reporting zone deleted successfully" });
    } catch (error: any) {
      if (error.message === "Reporting zone not found") {
        return sendError(res, 404, error.message, "ZONE_NOT_FOUND");
      }
      sendError(
        res,
        500,
        "Failed to delete reporting zone",
        "ZONE_DELETE_FAILED",
      );
    }
  }
}
