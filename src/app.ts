import express, { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import userRoutes from "./routes/user.routes";
import taskRoutes from "./routes/task.routes";
import { env } from "./config/env.config";
// Import encryptionMiddleware here if you want it globally active:
// import { encryptionMiddleware } from "./middleware/encryptionMiddleware";

const app: Express = express();

// 1. Core HTTP & Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "Idempotency-Key", 
      "X-Skip-Envelope", 
      "x-skip-envelope",
      "x-encrypt"
    ],
  })
);

// Global Rate Limiter (Protects against automated endpoint abuse)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "TOO_MANY_REQUESTS",
    message: "Rate limit exceeded. Please try again later.",
  },
});
app.use(globalLimiter);

// 2. Body Parser Guarding
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 3. REAL-TIME TERMINAL LOGGER (Fixes silent execution)
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request onset
  console.log(`\n--------------------------------------------------`);
  console.log(`[INCOMING REQUEST] ${req.method} ${req.originalUrl}`);
  console.log(`[HEADERS] x-skip-envelope: ${req.headers["x-skip-envelope"] || "false"}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[BODY]`, JSON.stringify(req.body, null, 2));
  }

  // Intercept response finish to log status code and time taken
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(`[RESPONSE SENT] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
    console.log(`--------------------------------------------------\n`);
  });

  next();
});

// Optional: Mount encryption middleware globally if required across all /api endpoints
// app.use(encryptionMiddleware);

// 4. Healthcheck Endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "UP",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// 5. Domain Route Mounting
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);

// 6. Unmapped Route Catch-All (404)
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    code: "NOT_FOUND",
    message: "The requested API endpoint does not exist.",
  });
});

// 7. Enterprise Centralized Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[UNHANDLED_EXCEPTION]", {
    name: err.name,
    message: err.message,
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // Handle Objection.js / Schema Validation Errors
  if (err.name === "ValidationError") {
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Payload validation failed.",
      errors: err.data || err.details,
    });
    return;
  }

  // Custom Application Status Errors
  const statusCode = typeof err.status === "number" ? err.status : 500;
  const errorCode = err.code || "INTERNAL_SERVER_ERROR";

  res.status(statusCode).json({
    code: errorCode,
    message: statusCode === 500 && env.NODE_ENV === "production"
      ? "An unexpected internal server error occurred."
      : err.message,
  });
});

export default app;