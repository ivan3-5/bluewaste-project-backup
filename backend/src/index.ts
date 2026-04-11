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
import reportRoutes from "./routes/report.routes";
import userRoutes from "./routes/user.routes";
import barangayRoutes from "./routes/barangay.routes";
import notificationRoutes from "./routes/notification.routes";
import analyticsRoutes from "./routes/analytics.routes";
import uploadRoutes from "./routes/upload.routes";
import wasteReportRoutes from "./routes/wasteReport.routes";
import resortBoxRoutes from "./routes/resortBox.routes";
import { ReportService } from "./services/report.service";

const app = express();

const additionalOrigins = (env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  env.WEB_URL,
  env.MOBILE_URL,
  "http://localhost:3000",
  "http://localhost:8081",
  ...additionalOrigins,
]);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests (curl, health checks, server-to-server calls).
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
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
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/barangays", barangayRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/waste-reports", wasteReportRoutes);
app.use("/api/resort-boxes", resortBoxRoutes);

// Error handler
app.use(errorHandler);

function scheduleSpamCleanup() {
  const runCleanup = async () => {
    try {
      const deletedCount = await ReportService.purgeExpiredSpamReports();
      if (deletedCount > 0) {
        console.log(`🧹 Spam cleanup removed ${deletedCount} expired reports`);
      }
    } catch (error) {
      console.error("Spam cleanup failed:", error);
    }
  };

  // Run once on boot, then hourly.
  void runCleanup();
  const timer = setInterval(runCleanup, 60 * 60 * 1000);
  timer.unref();
}

// Start server (only in development, not in serverless)
const PORT = parseInt(env.PORT, 10);

if (env.NODE_ENV !== "production") {
  scheduleSpamCleanup();

  app.listen(PORT, () => {
    console.log(`🚀 BlueWaste API running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${env.NODE_ENV}`);
    console.log(`🗄️  Database connected`);
  });
}

export { app };
