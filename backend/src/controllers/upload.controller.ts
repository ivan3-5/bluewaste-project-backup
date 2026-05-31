import { Response } from "express";
import { CloudinaryService } from "../services/cloudinary.service";
import { AuthRequest } from "../middleware/auth";
import { sendError } from "../utils/http";

export class UploadController {
  static async uploadImage(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return sendError(res, 400, "No file uploaded", "NO_FILE_UPLOADED");
      }

      const result = await CloudinaryService.uploadImage(req.file.buffer);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Cloudinary upload error in UploadController:", error);
      sendError(res, 500, "Failed to upload image", "IMAGE_UPLOAD_FAILED");
    }
  }
}
