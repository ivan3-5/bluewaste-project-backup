import { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";
import { UploadValidationError } from "./upload";
import { sendError } from "../utils/http";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error("Error:", err.message);

  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  // Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    return sendError(res, 400, "Database operation failed.", "DB_KNOWN_ERROR");
  }

  if (err.name === "PrismaClientValidationError") {
    return sendError(res, 400, "Invalid data provided.", "DB_VALIDATION");
  }

  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return sendError(res, 400, "File is too large. Maximum size is 5MB.");
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      return sendError(
        res,
        400,
        "Too many files uploaded. Maximum is 5 files.",
      );
    }

    return sendError(res, 400, "Invalid upload request.");
  }

  if (err instanceof UploadValidationError) {
    return sendError(res, 400, err.message, "UPLOAD_VALIDATION");
  }

  if (
    err.message?.startsWith("CORS_ORIGIN_BLOCKED:") ||
    err.message === "Not allowed by CORS"
  ) {
    return sendError(
      res,
      403,
      "Request origin is not allowed.",
      "CORS_ORIGIN_BLOCKED",
    );
  }

  return sendError(res, 500, "Internal server error.", "INTERNAL_ERROR");
};
