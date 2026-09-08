import dotenv from "dotenv";
dotenv.config();

import { Server } from "http";
import app from "./app";
import { db } from "./config/database";
import { env } from "./config/env.config";

const PORT = env.PORT || 3000;
let server: Server;

/**
 * Gracefully shuts down the HTTP server and database connection pool.
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`[SHUTDOWN] Received ${signal}. Initiating graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log("[SHUTDOWN] HTTP server closed.");

      try {
        await db.destroy();
        console.log("[SHUTDOWN] Database connection pool closed.");
        process.exit(0);
      } catch (err) {
        console.error("[SHUTDOWN_ERROR] Failed to close database connection pool cleanly:", err);
        process.exit(1);
      }
    });

    // Force close after 10 seconds if connections fail to drain
    setTimeout(() => {
      console.error("[SHUTDOWN_TIMED_OUT] Could not close connections in time, forcing exit.");
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
};

/**
 * Bootstraps database connectivity and initializes HTTP listener.
 */
const startServer = async (): Promise<void> => {
  try {
    // 1. Verify Database Connectivity
    await db.raw("SELECT 1");
    console.log("[DATABASE] Connection pool established successfully.");

    // 2. Start Express HTTP Server
    server = app.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT} in [${env.NODE_ENV}] mode`);
    });
  } catch (error: unknown) {
    console.error("[FATAL_BOOTSTRAP_ERROR] Failed to start server:", error);
    process.exit(1);
  }
};

// --- Process Health Event Listeners ---

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason: unknown) => {
  console.error("[UNHANDLED_REJECTION] Critical unhandled Promise rejection:", reason);
  // Optional: Trigger monitoring alert (e.g., Sentry / Datadog)
});

process.on("uncaughtException", (error: Error) => {
  console.error("[UNCAUGHT_EXCEPTION] Fatal error encountered:", error.message, error.stack);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

startServer();