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

  static async getReports(req: AuthRequest, res: Response) {
    try {
      const result = await ReportService.getReports(req.query as any);
      res.json(result);
    } catch (error: any) {
      sendError(res, 500, "Failed to fetch reports", "REPORT_FETCH_FAILED");
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
      if (error.message === "Report not found") {
        return sendError(res, 404, error.message, "REPORT_NOT_FOUND");
      }
      if (error.message === "Field worker not found") {
        return sendError(res, 404, error.message, "WORKER_NOT_FOUND");
      }
      if (error.message === "Report is marked as spam") {
        return sendError(res, 400, error.message, "REPORT_SPAM");
      }
      sendError(res, 500, "Failed to assign worker", "REPORT_ASSIGN_FAILED");
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
      const reports = await ReportService.getMapData(req.query as any);
      res.setHeader("Cache-Control", "public, max-age=15");
      res.json(reports);
    } catch (error: any) {
      sendError(res, 500, "Failed to fetch map data", "MAP_DATA_FETCH_FAILED");
    }
  }

  static async getHeatmapData(req: AuthRequest, res: Response) {
    try {
      const data = await ReportService.getHeatmapData(req.query as any);
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

      // Perform automatic background AI YOLO analysis for report images
      if (images.length > 0 && (!req.body.type || req.body.type === "REPORT")) {
        try {
          const firstImage = images[0];
          const analysis = await ReportService["requestYoloAnalysis"](firstImage.imageUrl);

          const confidence = analysis.confidence ?? 0;
          const originalConfidence = analysis.originalConfidence ?? confidence;
          const isUncertain =
            analysis.isUncertain ||
            (confidence >= 0.35 && confidence <= 0.65) ||
            confidence < 0.18; // Mark 35%-65% range as spam explicitly, or use fallback

          console.log(`[AI Analysis Background Task]`);
          console.log(`  - Image URL: ${firstImage.imageUrl}`);
          console.log(`  - Original Confidence Level: ${(originalConfidence * 100).toFixed(1)}%`);
          console.log(`  - Modified/Final Confidence Level: ${(confidence * 100).toFixed(1)}%`);
          console.log(`  - Marked as Spam/Uncertain: ${isUncertain}`);

          if (isUncertain) {
            await prisma.report.update({
              where: { id },
              data: {
                isSpam: true,
                spamMarkedAt: new Date(),
                spamReason: `AI Auto-Spam: Image could not be clearly identified as containing waste or being clean (low confidence of ${(confidence * 100).toFixed(1)}%).`,
                analysisStatus: "CLEAN",
                analysisConfidence: confidence,
                analysisWasteCount: analysis.wasteCount,
                analyzedAt: new Date(),
              },
            });
          } else {
            await prisma.report.update({
              where: { id },
              data: {
                analysisStatus: analysis.status,
                analysisConfidence: confidence,
                analysisWasteCount: analysis.wasteCount,
                analyzedAt: new Date(),
              },
            });
          }
        } catch (analysisError) {
          console.error("Automatic background YOLO analysis failed:", analysisError);
          // Do not crash the upload request if background AI analysis encounters an issue.
        }
      }

      res.status(201).json(images);
    } catch (error: any) {
      console.error("Cloudinary upload error in ReportController.addImages:", error);
      sendError(res, 500, "Failed to upload images", "IMAGE_UPLOAD_FAILED");
    }
  }

  static async restoreSpam(req: AuthRequest, res: Response) {
    try {
      const report = await ReportService.restoreSpam(req.params.id);
      res.json(report);
    } catch (error: any) {
      if (error.message === "Report not found") {
        return sendError(res, 404, error.message, "REPORT_NOT_FOUND");
      }
      sendError(
        res,
        500,
        "Failed to restore spam report",
        "REPORT_RESTORE_FAILED",
      );
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const report = await prisma.report.findUnique({
        where: { id },
        select: { id: true, reporterId: true, status: true },
      });

      if (!report) {
        return sendError(res, 404, "Report not found", "REPORT_NOT_FOUND");
      }

      const requesterId = req.user?.id;
      const requesterRole = req.user?.role;

      const canDelete =
        requesterRole === "LGU_ADMIN" ||
        (report.reporterId === requesterId && report.status === "PENDING");

      if (!canDelete) {
        return sendError(res, 403, "Insufficient permissions.", "FORBIDDEN");
      }

      await ReportService.softDelete(id);
      res.json({ message: "Report deleted successfully" });
    } catch (error: any) {
      if (error.message === "Report not found") {
        return sendError(res, 404, error.message, "REPORT_NOT_FOUND");
      }
      sendError(res, 500, "Failed to delete report", "REPORT_DELETE_FAILED");
    }
  }
}
