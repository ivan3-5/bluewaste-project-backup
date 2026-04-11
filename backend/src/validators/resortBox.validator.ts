import { z } from "zod";

const latSchema = z.number().min(-90).max(90);
const lngSchema = z.number().min(-180).max(180);

export const resortBoxIdParamSchema = z.object({
  id: z.string().uuid("Invalid resort box ID"),
});

export const createResortBoxSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Name must be at least 3 characters")
      .max(120),
    description: z.string().trim().max(500).optional(),
    minLat: latSchema,
    maxLat: latSchema,
    minLng: lngSchema,
    maxLng: lngSchema,
    ownerId: z.string().uuid("Invalid owner user ID"),
  })
  .refine((value) => value.minLat < value.maxLat, {
    message: "minLat must be less than maxLat",
    path: ["minLat"],
  })
  .refine((value) => value.minLng < value.maxLng, {
    message: "minLng must be less than maxLng",
    path: ["minLng"],
  });

export const updateResortBoxSchema = z
  .object({
    name: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    minLat: latSchema.optional(),
    maxLat: latSchema.optional(),
    minLng: lngSchema.optional(),
    maxLng: lngSchema.optional(),
    ownerId: z.string().uuid("Invalid owner user ID").optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  })
  .refine(
    (value) => {
      if (value.minLat === undefined || value.maxLat === undefined) {
        return true;
      }
      return value.minLat < value.maxLat;
    },
    {
      message: "minLat must be less than maxLat",
      path: ["minLat"],
    },
  )
  .refine(
    (value) => {
      if (value.minLng === undefined || value.maxLng === undefined) {
        return true;
      }
      return value.minLng < value.maxLng;
    },
    {
      message: "minLng must be less than maxLng",
      path: ["minLng"],
    },
  );

export const listResortBoxesQuerySchema = z.object({
  includeInactive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});
