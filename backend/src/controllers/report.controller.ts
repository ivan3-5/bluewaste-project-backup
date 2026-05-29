import { Request, Response } from "express";
import { ReportService } from "../services/report.service";
import { AuthRequest } from "../middleware/auth";
import prisma from "../config/database";
import { CloudinaryService } from "../services/cloudinary.service";
import { sendError } from "../utils/http";

export class ReportController {
  static async create(req: AuthRequest, res: Response) {
    try {
      const report = await ReportService.create({
        ...req.body,
        reporterId: req.user?.id,
      });
      res.status(201).json(report);
    } catch (error: any) {
      sendError(res, 500, "Failed to create report", "REPORT_CREATE_FAILED");
    }
  }

  static async findById(req: AuthRequest, res: Response) {
    try {
      const report = await ReportService.findById(req.params.id, req.user);
      res.json(report);
    } catch (error: any) {
      if (error.message === "Report not found") {
        return sendError(res, 404, error.message, "REPORT_NOT_FOUND");
      }
      if (error.message === "Insufficient permissions.") {
        return sendError(res, 403, error.message, "FORBIDDEN");
      }
      sendError(res, 500, "Failed to fetch report", "REPORT_FETCH_FAILED");
    }
  }

  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { status, notes } = req.body;
      const report = await ReportService.updateStatus(
        req.params.id,
        status,
        req.user!.id,
        notes,
      );
      res.json(report);
    } catch (error: any) {
      if (error.message === "Report not found") {
        return sendError(res, 404, error.message, "REPORT_NOT_FOUND");
      }
      sendError(
        res,
        500,
        "Failed to update status",
        "REPORT_STATUS_UPDATE_FAILED",
      );
    }
  }

  static async getMyReports(req: AuthRequest, res: Response) {
    try {
      const result = await ReportService.getMyReports(
        req.user!.id,
        req.query as any,
      );
      res.json(result);
    } catch (error: any) {
      sendError(res, 500, "Failed to fetch reports", "REPORT_FETCH_FAILED");
    }
  }

  static async getAssignedReports(req: AuthRequest, res: Response) {
    try {
      const result = await ReportService.getAssignedReports(
        req.user!.id,
        req.query as any,
      );
      res.json(result);
    } catch (error: any) {
      sendError(
        res,
        500,
        "Failed to fetch assigned reports",
        "ASSIGNED_REPORT_FETCH_FAILED",
      );
    }
  }

  static async getMapData(req: AuthRequest, res: Response) {
    try {
      const reports = await ReportService.getMapData(
        req.query as any,
        req.user,
      );
      res.setHeader("Cache-Control", "public, max-age=15");
      res.json(reports);
    } catch (error: any) {
      sendError(res, 500, "Failed to fetch map data", "MAP_DATA_FETCH_FAILED");
    }
  }

  static async getHeatmapData(req: AuthRequest, res: Response) {
    try {
      const data = await ReportService.getHeatmapData(
        req.query as any,
        req.user,
      );
      res.setHeader("Cache-Control", "public, max-age=15");
      res.json(data);
    } catch (error: any) {
      sendError(
        res,
        500,
        "Failed to fetch heatmap data",
        "HEATMAP_FETCH_FAILED",
      );
    }
  }

  static async addImages(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return sendError(res, 400, "No files uploaded", "NO_FILES_UPLOADED");
      }

      const report = await prisma.report.findUnique({
        where: { id },
        select: {
          id: true,
          reporterId: true,
          assignedToId: true,
        },
      });
      if (!report) {
        return sendError(res, 404, "Report not found", "REPORT_NOT_FOUND");
      }

      const requesterId = req.user?.id;
      const requesterRole = req.user?.role;

      const canUpload =
        requesterRole === "LGU_ADMIN" ||
        report.reporterId === requesterId ||
        report.assignedToId === requesterId;

      if (!canUpload) {
        return sendError(res, 403, "Insufficient permissions.", "FORBIDDEN");
      }

      const uploadPromises = files.map(async (file) => {
        const result = await CloudinaryService.uploadImage(file.buffer);
        return prisma.reportImage.create({
          data: {
            reportId: id,
            imageUrl: result.url,
            publicId: result.publicId,
            type: req.body.type || "REPORT",
          },
        });
      });

      const images = await Promise.all(uploadPromises);
      res.status(201).json(images);
    } catch (error: any) {
      sendError(res, 500, "Failed to upload images", "IMAGE_UPLOAD_FAILED");
    }
  }
}
