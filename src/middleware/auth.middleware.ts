import { Request, Response, NextFunction } from "express";
import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import { env } from "../config/env.config";

// Re-export interface for standard request extension across controllers/services
export interface AuthenticatedUser {
  id: number;
  email: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Enterprise Authentication Middleware
 * Enforces stateless Bearer token validation and attaches decoded identity to the request context.
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  // 1. Guard against missing or non-Bearer authorization schemes
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      code: "UNAUTHORIZED_MISSING_TOKEN",
      message: "Access denied. Valid Bearer token required.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  // Extra check for empty token payload ("Bearer ")
  if (!token) {
    res.status(401).json({
      code: "UNAUTHORIZED_MALFORMED_HEADER",
      message: "Access denied. Authorization token is empty.",
    });
    return;
  }

  try {
    // 2. Verify token signature against validated application secret
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;

    // Direct assignment to express Request context
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      res.status(401).json({
        code: "TOKEN_EXPIRED",
        message: "Authentication session expired. Please re-authenticate.",
      });
      return;
    }

    if (error instanceof JsonWebTokenError) {
      res.status(401).json({
        code: "INVALID_TOKEN",
        message: "Authentication failed. Token signature is invalid or corrupted.",
      });
      return;
    }

    // Fail safe for any unhandled JWT exceptions
    next(error);
  }
};