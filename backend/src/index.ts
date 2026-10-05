import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Load environment variables natively if available in Node 20+
try {
  if (typeof (process as any).loadEnvFile === "function") {
    (process as any).loadEnvFile();
  }
} catch {
  // If .env is missing or already loaded, continue
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://campusos:campusos@localhost:5432/campusos";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "super_secret_campus_os_jwt_token_key_dev_mode_2026";
}

import { initSocket } from "./lib/socket";
import { errorHandler } from "./errors";

import authRoutes from "./routes/auth";
import issuesRoutes from "./routes/issues";
import adminRoutes from "./routes/admin";
import studentRoutes from "./routes/student";
import secondaryRoutes from "./routes/secondary";

const app = express();
const server = http.createServer(app);

// 1. Security headers via Helmet
app.use(helmet());

// 2. CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// 3. Body parsers
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// 4. Rate Limiting (1000 requests per 15 minutes in general, stricter on auth)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// 5. Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), service: "campus-os-backend" });
});

// 6. Mount routes
app.use("/auth", authRoutes);
app.use("/issues", issuesRoutes);
app.use("/admin", adminRoutes);
app.use("/student", studentRoutes);
app.use("/user", studentRoutes);
app.use("/", secondaryRoutes);

// 7. Initialize Socket.IO
initSocket(server);

// 8. Centralized error handling
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Campus OS Backend running on port ${PORT}`);
});

export { app, server };
