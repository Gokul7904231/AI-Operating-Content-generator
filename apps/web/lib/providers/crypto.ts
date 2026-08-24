import crypto from "crypto";

const ENCRYPTION_KEY = Buffer.concat([
  Buffer.from(process.env.ENCRYPTION_KEY || "shortfactory-default-master-key-32b"),
  Buffer.alloc(32)
], 32);

/**
 * AES-256-GCM Authenticated Encryption
 * Output format: gcm:<ivHex>:<authTagHex>:<ciphertextHex>
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `gcm:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Backwards-compatible Decryption Handler
 * Supports both AES-256-GCM (new) and AES-256-CBC (legacy).
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || typeof encryptedText !== "string") return "";

  try {
    // 1. AES-256-GCM Mode
    if (encryptedText.startsWith("gcm:")) {
      const parts = encryptedText.split(":");
      if (parts.length < 4) return encryptedText;

      const iv = Buffer.from(parts[1], "hex");
      const authTag = Buffer.from(parts[2], "hex");
      const ciphertext = parts[3];

      const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(ciphertext, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    }

    // 2. Legacy AES-256-CBC Fallback
    const [ivHex, encrypted] = encryptedText.split(":");
    if (!ivHex || !encrypted) return encryptedText;

    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[CryptoSDK] Decryption failed, returning plain text fallback.");
    return encryptedText;
  }
}
