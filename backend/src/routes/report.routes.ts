import { Router } from "express";
import { ReportController } from "../controllers/report.controller";
import { authenticate, optionalAuth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  createReportSchema,
  updateStatusSchema,
  mapFilterSchema,
  heatmapFilterSchema,
  reportFilterSchema,
  assignWorkerSchema,
} from "../validators/report.validator";
import { upload, validateUploadedImages } from "../middleware/upload";

const router = Router();

// Public / optional auth routes
router.get(
  "/map",
  optionalAuth,
  validate(mapFilterSchema, "query"),
  ReportController.getMapData,
);
router.get(
  "/heatmap",
  optionalAuth,
  validate(heatmapFilterSchema, "query"),
  ReportController.getHeatmapData,
);

// Authenticated routes
router.post(
  "/",
  authenticate,
  validate(createReportSchema),
  ReportController.create,
);

router.get(
  "/",
  authenticate,
  authorize("LGU_ADMIN"),
  validate(reportFilterSchema, "query"),
  ReportController.getReports,
);

router.get("/my-reports", authenticate, ReportController.getMyReports);
router.get(
  "/assigned",
  authenticate,
  authorize("FIELD_WORKER"),
  ReportController.getAssignedReports,
);

// Single report routes
router.get("/:id", authenticate, ReportController.findById);

// Field Worker actions
router.put(
  "/:id/status",
  authenticate,
  authorize("FIELD_WORKER", "LGU_ADMIN"),
  validate(updateStatusSchema),
  ReportController.updateStatus,
);

router.put(
  "/:id/assign",
  authenticate,
  authorize("LGU_ADMIN"),
  validate(assignWorkerSchema),
  ReportController.assignWorker,
);

// Image upload
router.post(
  "/:id/images",
  authenticate,
  upload.array("images", 5),
  validateUploadedImages,
  ReportController.addImages,
);

// Admin spam restore and delete
router.put(
  "/:id/restore-spam",
  authenticate,
  authorize("LGU_ADMIN"),
  ReportController.restoreSpam,
);

router.delete(
  "/:id",
  authenticate,
  authorize("LGU_ADMIN"),
  ReportController.delete,
);

export default router;
