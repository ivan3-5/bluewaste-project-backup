import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";

import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { generalLimiter } from "./middleware/rateLimiter";

// Import routes
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import reportRoutes from "./routes/report.routes";
import notificationRoutes from "./routes/notification.routes";
import uploadRoutes from "./routes/upload.routes";
import wasteReportRoutes from "./routes/wasteReport.routes";
import reportingZoneRoutes from "./routes/reportingZone.routes";
import analyticsRoutes from "./routes/analytics.routes";

const app = express();

const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, "");

const additionalOrigins = (env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const vercelOrigins = [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
]
  .filter((value): value is string => Boolean(value && value.trim()))
  .flatMap((value) => {
    const trimmed = value.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return [trimmed];
    }
    return [`https://${trimmed}`];
  });

const allowedOrigins = new Set(
  [
    normalizeOrigin(env.WEB_URL),
    "http://localhost:3001",
    normalizeOrigin(env.MOBILE_URL),
    "http://localhost:3000",
    "http://localhost:8081",
    "https://bluewaste-management-system.vercel.app",
    "https://bluewaste-system.vercel.app",
    ...additionalOrigins,
    ...vercelOrigins,
  ].map(normalizeOrigin),
);

const isTrustedVercelPreviewOrigin = (origin: string): boolean => {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") {
      return false;
    }

    return (
      /^bluewaste-management-system(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(
        url.hostname,
      ) || /^bluewaste-system(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
};

const isLocalNetworkOrigin = (origin: string): boolean => {
  if (env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    // Allow localhost, 127.0.0.1, and local private network IPs (192.168.x.x, 10.x.x.x, 172.16.x.x)
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      /^192\.168\.\d+\.\d+$/i.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/i.test(hostname) ||
      /^172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+$/i.test(hostname)
    );
  } catch {
    return false;
  }
};

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests (curl, health checks, server-to-server calls).
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (
      allowedOrigins.has(normalizedOrigin) ||
      isTrustedVercelPreviewOrigin(normalizedOrigin) ||
      isLocalNetworkOrigin(normalizedOrigin)
    ) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS_ORIGIN_BLOCKED:${normalizedOrigin}`));
  },
  credentials: true,
};

// Ensure correct client IP detection behind reverse proxies/load balancers.
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan("dev"));

// Rate limiting
app.use(generalLimiter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "BlueWaste API",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/waste-reports", wasteReportRoutes);
app.use("/api/reporting-zones", reportingZoneRoutes);
app.use("/api/analytics", analyticsRoutes);

// Error handler
app.use(errorHandler);

// Start server (only in development, not in serverless)
const PORT = parseInt(env.PORT, 10);

if (env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 BlueWaste API running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${env.NODE_ENV}`);
    console.log(`🗄️  Database connected`);
  });
}

export { app };
