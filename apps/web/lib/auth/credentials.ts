import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || crypto.scryptSync(process.env.INTERNAL_API_SECRET_KEY || "factoryos-secret-2026", "salt", 32);

export interface EncryptedCredential {
  iv: string; // hex
  authTag: string; // hex
  encryptedData: string; // hex
}

// In-memory server store for encrypted BYOK credentials (scoped by UID)
const encryptedUserCredentials = new Map<string, Record<string, EncryptedCredential>>();

/**
 * Encrypts a raw API key at rest using AES-256-GCM.
 */
export function encryptCredential(rawKey: string): EncryptedCredential {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  
  let encrypted = cipher.update(rawKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    iv: iv.toString("hex"),
    authTag,
    encryptedData: encrypted,
  };
}

/**
 * Decrypts a stored credential server-side only when invoking AI providers.
 */
export function decryptCredential(cred: EncryptedCredential): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, Buffer.from(cred.iv, "hex"));
  decipher.setAuthTag(Buffer.from(cred.authTag, "hex"));
  
  let decrypted = decipher.update(cred.encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function saveUserCredential(uid: string, provider: string, rawKey: string): string {
  const encrypted = encryptCredential(rawKey);
  const userMap = encryptedUserCredentials.get(uid) || {};
  userMap[provider] = encrypted;
  encryptedUserCredentials.set(uid, userMap);

  // Return masked representation only (AIza...6Key)
  return maskApiKey(rawKey);
}

export function getUserCredentialsStatus(uid: string): Record<string, { configured: boolean; maskedKey: string }> {
  const userMap = encryptedUserCredentials.get(uid) || {};
  const status: Record<string, { configured: boolean; maskedKey: string }> = {};

  for (const [provider, cred] of Object.entries(userMap)) {
    const rawKey = decryptCredential(cred);
    status[provider] = {
      configured: true,
      maskedKey: maskApiKey(rawKey),
    };
  }

  return status;
}

export function getDecryptedUserCredential(uid: string, provider: string): string | null {
  const userMap = encryptedUserCredentials.get(uid);
  if (!userMap || !userMap[provider]) return null;
  return decryptCredential(userMap[provider]);
}

export function maskApiKey(rawKey: string): string {
  if (!rawKey || rawKey.length <= 8) return "••••••••";
  return `${rawKey.slice(0, 4)}...${rawKey.slice(-4)}`;
}
