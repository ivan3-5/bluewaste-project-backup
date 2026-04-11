import { z } from "zod";

export const createReportSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000),
  category: z.enum([
    "SOLID_WASTE",
    "HAZARDOUS",
    "LIQUID",
    "RECYCLABLE",
    "ORGANIC",
    "ELECTRONIC",
    "OTHER",
  ]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(500).optional(),
  barangayId: z.string().uuid().optional(),
  isAnonymous: z.boolean().default(false),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
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

export const assignWorkerSchema = z.object({
  assignedToId: z.string().uuid("Invalid worker ID"),
});

export const reportFilterSchema = z.object({
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
      "SOLID_WASTE",
      "HAZARDOUS",
      "LIQUID",
      "RECYCLABLE",
      "ORGANIC",
      "ELECTRONIC",
      "OTHER",
    ])
    .optional(),
  barangayId: z.string().uuid().optional(),
  startDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid startDate")
    .optional(),
  endDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid endDate")
    .optional(),
  search: z.string().max(100).optional(),
  isSpam: z.enum(["true", "false"]).optional(),
  page: z.string().regex(/^\d+$/, "page must be a positive integer").optional(),
  limit: z
    .string()
    .regex(/^\d+$/, "limit must be a positive integer")
    .optional(),
});

export const analyzeReportSchema = z.object({
  imageId: z.string().uuid().optional(),
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
      "SOLID_WASTE",
      "HAZARDOUS",
      "LIQUID",
      "RECYCLABLE",
      "ORGANIC",
      "ELECTRONIC",
      "OTHER",
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
