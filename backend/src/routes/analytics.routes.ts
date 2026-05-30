import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";

const router = Router();

router.get(
  "/dashboard",
  authenticate,
  authorize("LGU_ADMIN"),
  AnalyticsController.getDashboardOverview,
);

export default router;
