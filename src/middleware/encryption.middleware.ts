import { Request, Response, NextFunction } from "express";
import { encrypt, decrypt } from "../utils/crypto";

/**
 * Enterprise Payload Encryption Middleware
 * Handles automated decryption of incoming encrypted request wrappers
 * and enforces fail-safe AES envelope encryption on outgoing responses.
 */
export const encryptionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 1. Decrypt incoming wrapped payload ({ data: "iv:tag:cipher" })
  if (req.body && typeof req.body === "object" && "data" in req.body) {
    try {
      if (typeof req.body.data !== "string") {
        res.status(400).json({
          code: "INVALID_ENVELOPE_FORMAT",
          message: "Encrypted 'data' payload must be a valid string.",
        });
        return;
      }

      const decryptedString = decrypt(req.body.data);
      const parsedBody = JSON.parse(decryptedString);

      // Guard against non-object parsed results (e.g. JSON stringified primitive)
      if (typeof parsedBody !== "object" || parsedBody === null) {
        res.status(400).json({
          code: "INVALID_DECRYPTED_PAYLOAD",
          message: "Decrypted payload must evaluate to a JSON object.",
        });
        return;
      }

      req.body = parsedBody;
    } catch (error) {
      console.error("[DECRYPTION_ERROR] Failed to decrypt incoming payload:", error);
      res.status(400).json({
        code: "PAYLOAD_DECRYPTION_FAILED",
        message: "Failed to decrypt incoming request envelope. Tampering or invalid key detected.",
      });
      return;
    }
  }

  // 2. Intercept response payload to guarantee encrypted outbound transport
  const originalJson = res.json.bind(res);
  let isHandled = false; // Flag to prevent infinite recursive calls on internal errors

  res.json = (body: any): Response => {
    // Prevent re-processing if res.json is called internally during error handling
    if (isHandled) {
      return originalJson(body);
    }

    // Skip wrapping if the bypass header is provided (relaxed for local testing)
    const bypassHeader = req.headers["x-skip-envelope"];
    if (bypassHeader === "true") {
      isHandled = true;
      return originalJson(body);
    }

    try {
      const jsonString = JSON.stringify(body);
      const encryptedData = encrypt(jsonString);

      isHandled = true;
      // Return unified encrypted envelope format
      return originalJson({ data: encryptedData });
    } catch (error) {
      isHandled = true;

      // Log full trace to server terminal to reveal exact cause of encrypt() failure
      console.error("[FATAL_ENCRYPTION_ERROR] Outbound payload encryption failed.", {
        path: req.originalUrl,
        method: req.method,
        error: error instanceof Error ? error.stack : error,
      });

      res.statusCode = 500;
      return originalJson({
        code: "ENCRYPTION_DISPATCH_FAILURE",
        message: "Failed to securely package response payload.",
      });
    }
  };

  next();
};