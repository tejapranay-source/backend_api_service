import crypto from "crypto";
import { env } from "../config/env.config";

// AES-256-GCM (Authenticated Encryption with Associated Data)
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits standard for standard GCM IV
const AUTH_TAG_LENGTH = 16; // 128 bits auth tag

// Enforce strict 32-byte binary key conversion from hex
const getEncryptionKey = (): Buffer => {
  const keyBuffer = Buffer.from(env.ENCRYPTION_KEY, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("ENCRYPTION_KEY must evaluate to exactly 32 bytes (64 hex characters).");
  }
  return keyBuffer;
};

/**
 * Encrypts a cleartext string returning a colon-delimited string format: IV:AUTH_TAG:ENCRYPTED_DATA
 */
export const encrypt = (text: string): string => {
  if (typeof text !== "string") {
    throw new Error("Plaintext input to encrypt must be a valid string.");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:cipherText
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
};

/**
 * Decrypts a colon-delimited cipher string and verifies AEAD authenticity.
 */
export const decrypt = (cipherText: string): string => {
  if (typeof cipherText !== "string") {
    throw new Error("Ciphertext input to decrypt must be a valid string.");
  }

  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid cipher payload structure. Expected format: 'iv:authTag:encryptedData'");
  }

  const [ivHex, authTagHex, encryptedDataHex] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const key = getEncryptionKey();

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid initialization vector (IV) length.");
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid authentication tag length.");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedDataHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};