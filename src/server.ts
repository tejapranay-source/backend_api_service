import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { db } from "./config/database";

const PORT: number = process.env.PORT ? Number(process.env.PORT) : 3000;

const startServer = async (): Promise<void> => {
  try {
    // Check database connection
    await db.raw("SELECT NOW()");

    console.log("Database connected successfully");

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error: unknown) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

startServer();