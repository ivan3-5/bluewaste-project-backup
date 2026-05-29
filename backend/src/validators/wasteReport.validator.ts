import { z } from "zod";

const detectionSchema = z.object({
  type: z.enum(["PLASTIC", "ORGANIC", "GLASS", "METAL", "PAPER"]),
  confidence: z.number().min(0).max(1),
  bbox: z.array(z.number().int()).length(4),
});

export const createWasteReportSchema = z.object({
  imageUrl: z.string().url("imageUrl must be a valid URL"),
  detectedObject: z
    .string()
    .min(1, "detectedObject is required")
    .max(120, "detectedObject must be 120 characters or less"),
  detections: z.array(detectionSchema).default([]),
  labels: z.array(z.string()).max(25).default([]),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().max(300).optional(),
});

export const wasteReportFilterSchema = z.object({
  page: z.string().regex(/^\d+$/, "page must be a positive integer").optional(),
  limit: z
    .string()
    .regex(/^\d+$/, "limit must be a positive integer")
    .optional(),
});
