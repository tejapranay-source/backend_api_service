import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  JWT_SECRET: process.env.JWT_SECRET || "super-secret-jwt-key",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
  ENCRYPTION_KEY:
    process.env.ENCRYPTION_KEY ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
};