import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface IUserPayload {
  id: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUserPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      return res.status(500).json({
        message: "JWT secret is not configured",
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Unauthorized. Token required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET) as IUserPayload;

    req.user = decoded;

    console.log(
      `[AUTH SUCCESS] User '${decoded.email}' (ID: ${decoded.id}) is accessing: ${req.method} ${req.originalUrl}`
    );

    next();
  } catch (error) {
    console.error("Authentication failed:", error);

    return res.status(401).json({
      message: "Unauthorized. Invalid or expired token.",
    });
  }
};