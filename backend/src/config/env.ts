import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import fs from "fs";

const envLocalPath = path.join(process.cwd(), ".env.local");
const envPath = path.join(process.cwd(), ".env");

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  PORT: z.string().default("5000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  WEB_URL: z.string().default("http://localhost:3000"),
  MOBILE_URL: z.string().default("http://localhost:8081"),
  ALLOWED_ORIGINS: z.string().optional(),
  YOLO_API_URL: z.string().url().default("http://localhost:8000/predict"),
  SPAM_RETENTION_DAYS: z.coerce.number().int().min(1).default(3),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
