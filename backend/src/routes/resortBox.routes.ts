import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { ResortBoxController } from "../controllers/resortBox.controller";
import {
  createResortBoxSchema,
  listResortBoxesQuerySchema,
  resortBoxIdParamSchema,
  updateResortBoxSchema,
} from "../validators/resortBox.validator";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("LGU_ADMIN", "RESORT_ADMIN"),
  validate(listResortBoxesQuerySchema, "query"),
  ResortBoxController.list,
);

router.post(
  "/",
  authenticate,
  authorize("LGU_ADMIN"),
  validate(createResortBoxSchema),
  ResortBoxController.create,
);

router.put(
  "/:id",
  authenticate,
  authorize("LGU_ADMIN"),
  validate(resortBoxIdParamSchema, "params"),
  validate(updateResortBoxSchema),
  ResortBoxController.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("LGU_ADMIN"),
  validate(resortBoxIdParamSchema, "params"),
  ResortBoxController.deactivate,
);

export default router;
