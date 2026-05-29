import { z } from "zod";

const roleEnum = z.enum([
  "CITIZEN",
  "LGU_ADMIN",
  "FIELD_WORKER",
]);

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  role: roleEnum,
  phone: z.string().max(30).optional(),
  barangayId: z.string().uuid().optional(),
});

export const updateUserSchema = z
  .object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    email: z.string().email().optional(),
    role: roleEnum.optional(),
    phone: z.string().max(30).optional(),
    barangayId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const userIdParamSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
});
