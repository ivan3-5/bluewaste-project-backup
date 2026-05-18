import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { ReportingZoneController } from "../controllers/reportingZone.controller";

const router = Router();

// Public read — citizens need active zones to validate location before submitting
router.get("/", ReportingZoneController.list);

// Admin write operations
router.post(
  "/",
  authenticate,
  authorize("LGU_ADMIN"),
  ReportingZoneController.create,
);

router.put(
  "/:id",
  authenticate,
  authorize("LGU_ADMIN"),
  ReportingZoneController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("LGU_ADMIN"),
  ReportingZoneController.delete,
);

export default router;
