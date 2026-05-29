import { z } from "zod";

export const createReportSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000),
  category: z.enum([
    "PLASTIC_WASTE",
    "ORGANIC_WASTE",
    "GLASS_WASTE",
    "METAL_WASTE",
    "PAPER_WASTE",
  ]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(500).optional(),
  barangayId: z.string().uuid().optional(),
  isAnonymous: z.boolean().default(false),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "VERIFIED",
    "CLEANUP_SCHEDULED",
    "IN_PROGRESS",
    "CLEANED",
    "REJECTED",
  ]),
  notes: z.string().max(500).optional(),
});

export const mapFilterSchema = z.object({
  status: z
    .enum([
      "PENDING",
      "VERIFIED",
      "CLEANUP_SCHEDULED",
      "IN_PROGRESS",
      "CLEANED",
      "REJECTED",
    ])
    .optional(),
  category: z
    .enum([
      "PLASTIC_WASTE",
      "ORGANIC_WASTE",
      "GLASS_WASTE",
      "METAL_WASTE",
      "PAPER_WASTE",
    ])
    .optional(),
  barangayId: z.string().uuid().optional(),
  limit: z
    .string()
    .regex(/^\d+$/, "limit must be a positive integer")
    .optional(),
});

export const heatmapFilterSchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, "limit must be a positive integer")
    .optional(),
});
