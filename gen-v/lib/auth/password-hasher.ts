/**
 * Cryptographic Password & Token Hashing Engine — FactoryOS v1
 * 
 * Implements OWASP-compliant scrypt password hashing and constant-time token verification.
 */

import crypto from "crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // N
const SCRYPT_BLOCK_SIZE = 8; // r
const SCRYPT_PARALLELIZATION = 1; // p
const SALT_BYTES = 32;

const PEPPER = process.env.INTERNAL_API_SECRET_KEY || "factoryos-auth-pepper-2026";

/**
 * Derives a secure password hash using scrypt and a cryptographically random salt.
 */
export async function hashPassword(password: string): Promise<{ passwordHash: string; passwordSalt: string }> {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      password,
      salt + PEPPER,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION },
      (err, progress) => {
        if (err) reject(err);
        else resolve(progress);
      }
    );
  });

  return {
    passwordHash: derivedKey.toString("hex"),
    passwordSalt: salt,
  };
}

/**
 * Verifies a plaintext password against the stored scrypt hash in constant time.
 */
export async function verifyPassword(
  password: string,
  storedHashHex: string,
  storedSaltHex: string
): Promise<boolean> {
  if (!password || !storedHashHex || !storedSaltHex) return false;

  try {
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(
        password,
        storedSaltHex + PEPPER,
        SCRYPT_KEYLEN,
        { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION },
        (err, progress) => {
          if (err) reject(err);
          else resolve(progress);
        }
      );
    });

    const storedBuffer = Buffer.from(storedHashHex, "hex");
    if (storedBuffer.length !== derivedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(storedBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Computes a constant-length HMAC-SHA256 hash of a numeric OTP.
 */
export function hashOtp(otp: string): string {
  return crypto.createHmac("sha256", PEPPER).update(otp.trim()).digest("hex");
}

/**
 * Compares two OTP hashes in constant time.
 */
export function verifyOtpHash(providedOtp: string, expectedHashHex: string): boolean {
  const computedHash = hashOtp(providedOtp);
  const computedBuf = Buffer.from(computedHash, "hex");
  const expectedBuf = Buffer.from(expectedHashHex, "hex");

  if (computedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuf, expectedBuf);
}

/**
 * Computes a SHA-256 hash of a reset authorization token.
 */
export function hashResetToken(token: string): string {
  return crypto.createHmac("sha256", PEPPER).update(token.trim()).digest("hex");
}

/**
 * Compares two reset token hashes in constant time.
 */
export function verifyResetTokenHash(providedToken: string, expectedHashHex: string): boolean {
  const computedHash = hashResetToken(providedToken);
  const computedBuf = Buffer.from(computedHash, "hex");
  const expectedBuf = Buffer.from(expectedHashHex, "hex");

  if (computedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuf, expectedBuf);
}

/**
 * Generates a cryptographically random 6-digit numeric OTP.
 */
export function generateNumericOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Generates a cryptographically random reset authorization token (32 bytes hex).
 */
export function generateResetAuthToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
