import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { ResortAreaController } from "../controllers/resortBox.controller";
import {
  createResortAreaSchema,
  listResortAreasQuerySchema,
  resortAreaIdParamSchema,
  updateResortAreaSchema,
} from "../validators/resortBox.validator";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("LGU_ADMIN", "RESORT_ADMIN"),
  validate(listResortAreasQuerySchema, "query"),
  ResortAreaController.list,
);

router.post(
  "/",
  authenticate,
  authorize("LGU_ADMIN"),
  validate(createResortAreaSchema),
  ResortAreaController.create,
);

router.put(
  "/:id",
  authenticate,
  authorize("LGU_ADMIN"),
  validate(resortAreaIdParamSchema, "params"),
  validate(updateResortAreaSchema),
  ResortAreaController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("LGU_ADMIN"),
  validate(resortAreaIdParamSchema, "params"),
  ResortAreaController.deactivate,
);

export default router;
