import { Request, Response, NextFunction } from "express";
import { encrypt, decrypt } from "../utils/crypto";

export const encryptionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  // Always decrypt incoming requests if they are wrapped in an encrypted envelope
  if (req.body && req.body.data) {
    try {
      const decryptedString = decrypt(req.body.data);
      req.body = JSON.parse(decryptedString);
    } catch (error) {
      return res.status(400).json({ message: "Invalid or malformed encrypted payload" });
    }
  }

  // Check header strictly for controlling response encryption 
  const encryptHeader = req.headers['x-encrypt'];
  const shouldEncrypt = encryptHeader !== 'false';

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (!shouldEncrypt) {
      return originalJson(body); // Returns raw cleartext JSON when x-encrypt: false
    }

    try {
      const jsonString = JSON.stringify(body);
      const encryptedData = encrypt(jsonString);
      return originalJson({ data: encryptedData }); // Returns encrypted wrapper when x-encrypt: true
    } catch (error) {
      console.error("Encryption failed for response:", error);
      return originalJson(body);
    }
  };

  next();
};