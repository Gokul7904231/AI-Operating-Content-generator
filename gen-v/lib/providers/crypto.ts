import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// Fallback to a fixed key if process.env.ENCRYPTION_KEY is not defined
const ENCRYPTION_KEY = Buffer.concat([
  Buffer.from(process.env.ENCRYPTION_KEY || "shortfactory-default-master-key-32b"),
  Buffer.alloc(32)
], 32);

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  try {
    const [ivHex, encrypted] = encryptedText.split(":");
    if (!ivHex || !encrypted) return encryptedText; // Fallback if plain text
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[CryptoSDK] Decryption failed, returning input as plain text.", err);
    return encryptedText;
  }
}
