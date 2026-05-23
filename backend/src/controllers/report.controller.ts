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

  static async findAll(req: AuthRequest, res: Response) {
    try {
      const result = await ReportService.findAll(req.query as any, req.user);
      res.json(result);
    } catch (error: any) {
      sendError(res, 500, "Failed to fetch reports", "REPORT_FETCH_FAILED");
    }
  }

  static async getSpamReports(req: AuthRequest, res: Response) {
    try {
      const result = await ReportService.getSpamReports(
        req.query as any,
        req.user,
      );
      res.json(result);
    } catch {
      sendError(res, 500, "Failed to fetch spam reports", "SPAM_FETCH_FAILED");
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

  static async analyzeImage(req: AuthRequest, res: Response) {
    try {
      const { imageId } = req.body;
      const result = await ReportService.analyzeReportImage(
        req.params.id,
        req.user!.id,
        imageId,
      );
      res.json(result);
    } catch (error: any) {
      const message =
        typeof error?.message === "string"
          ? error.message
          : "Failed to analyze report image";

      if (message === "Report not found") {
        return sendError(res, 404, message, "REPORT_NOT_FOUND");
      }
      if (message === "No report image found") {
        return sendError(res, 400, message, "REPORT_IMAGE_REQUIRED");
      }
      if (message === "Failed to fetch report image for analysis") {
        return sendError(
          res,
          502,
          "Could not fetch the report image for analysis.",
          "REPORT_IMAGE_FETCH_FAILED",
        );
      }
      if (message.includes("YOLO service is unavailable")) {
        return sendError(res, 502, message, "YOLO_SERVICE_UNAVAILABLE");
      }
      if (message.startsWith("YOLO API error:")) {
        return sendError(res, 502, message, "YOLO_API_ERROR");
      }
      console.error("Report analysis failed:", error);
      sendError(
        res,
        500,
        "Failed to analyze report image",
        "REPORT_ANALYZE_FAILED",
      );
    }
  }

  static async assignWorker(req: AuthRequest, res: Response) {
    try {
      const { assignedToId } = req.body;
      const report = await ReportService.assignWorker(
        req.params.id,
        assignedToId,
        req.user!.id,
      );
      res.json(report);
    } catch (error: any) {
      if (
        error.message === "Report not found" ||
        error.message === "Invalid field worker"
      ) {
        return sendError(res, 404, error.message, "REPORT_ASSIGNMENT_FAILED");
      }
      sendError(
        res,
        500,
        "Failed to assign worker",
        "REPORT_ASSIGNMENT_FAILED",
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

  static async deleteReport(req: AuthRequest, res: Response) {
    try {
      await ReportService.softDelete(req.params.id);
      res.json({ message: "Report deleted successfully" });
    } catch (error: any) {
      if (error.message === "Report not found") {
        return sendError(res, 404, error.message, "REPORT_NOT_FOUND");
      }
      sendError(res, 500, "Failed to delete report", "REPORT_DELETE_FAILED");
    }
  }

  static async purgeAllReports(req: AuthRequest, res: Response) {
    try {
      if (req.body?.confirm !== "DELETE_ALL_REPORTS") {
        return sendError(
          res,
          400,
          'Missing confirmation token. Send confirm: "DELETE_ALL_REPORTS".',
          "REPORT_PURGE_CONFIRMATION_REQUIRED",
        );
      }

      const summary = await ReportService.hardDeleteAllReports();
      res.json({
        message: "All reports deleted successfully",
        ...summary,
      });
    } catch (error: any) {
      sendError(res, 500, "Failed to purge reports", "REPORT_PURGE_FAILED");
    }
  }

  static async restoreSpam(req: AuthRequest, res: Response) {
    try {
      const restored = await ReportService.restoreFromSpam(
        req.params.id,
        req.user!.id,
      );
      res.json(restored);
    } catch (error: any) {
      if (error.message === "Spam report not found") {
        return sendError(res, 404, error.message, "SPAM_REPORT_NOT_FOUND");
      }
      sendError(
        res,
        500,
        "Failed to restore spam report",
        "SPAM_RESTORE_FAILED",
      );
    }
  }

  static async deleteSpam(req: AuthRequest, res: Response) {
    try {
      await ReportService.deleteSpamReport(req.params.id);
      res.json({ message: "Spam report deleted successfully" });
    } catch (error: any) {
      if (error.message === "Spam report not found") {
        return sendError(res, 404, error.message, "SPAM_REPORT_NOT_FOUND");
      }
      sendError(res, 500, "Failed to delete spam report", "SPAM_DELETE_FAILED");
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
