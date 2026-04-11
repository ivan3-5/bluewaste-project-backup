import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { sendError } from "../utils/http";
import { ResortAreaService } from "../services/resortBox.service";

export class ResortAreaController {
  static async create(req: AuthRequest, res: Response) {
    try {
      const created = await ResortAreaService.create({
        ...req.body,
        createdById: req.user!.id,
      });

      res.status(201).json(created);
    } catch (error: any) {
      if (
        error.message === "Invalid resort admin owner" ||
        error.message === "A map box with this name already exists" ||
        error.message?.startsWith("Map box overlaps with existing box")
      ) {
        return sendError(
          res,
          400,
          error.message,
          "RESORT_BOX_VALIDATION_FAILED",
        );
      }
      sendError(
        res,
        500,
        "Failed to create resort box",
        "RESORT_BOX_CREATE_FAILED",
      );
    }
  }

  static async list(req: AuthRequest, res: Response) {
    try {
      const includeInactive = String(req.query.includeInactive) === "true";

      const boxes = await ResortAreaService.list({
        requesterRole: req.user!.role,
        requesterId: req.user!.id,
        includeInactive,
      });

      res.json(boxes);
    } catch {
      sendError(
        res,
        500,
        "Failed to fetch resort boxes",
        "RESORT_BOX_FETCH_FAILED",
      );
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const updated = await ResortAreaService.update(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      if (error.message === "Resort box not found") {
        return sendError(res, 404, error.message, "RESORT_BOX_NOT_FOUND");
      }
      if (
        error.message === "Invalid resort admin owner" ||
        error.message === "A map box with this name already exists" ||
        error.message?.startsWith("Map box overlaps with existing box")
      ) {
        return sendError(
          res,
          400,
          error.message,
          "RESORT_BOX_VALIDATION_FAILED",
        );
      }

      sendError(
        res,
        500,
        "Failed to update resort box",
        "RESORT_BOX_UPDATE_FAILED",
      );
    }
  }

  static async deactivate(req: AuthRequest, res: Response) {
    try {
      await ResortAreaService.deactivate(req.params.id);
      res.json({ message: "Resort box deactivated successfully" });
    } catch (error: any) {
      if (error.message === "Resort box not found") {
        return sendError(res, 404, error.message, "RESORT_BOX_NOT_FOUND");
      }
      sendError(
        res,
        500,
        "Failed to deactivate resort box",
        "RESORT_BOX_DELETE_FAILED",
      );
    }
  }
}
