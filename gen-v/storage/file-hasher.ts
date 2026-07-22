/**
 * File Hasher
 *
 * Computes SHA-256 and MD5 checksums for any local file before upload.
 * Used by the StorageQueue for:
 *   - Duplicate detection (same hash → skip re-upload)
 *   - Integrity verification (re-download and re-hash)
 *   - Firestore deduplication index
 */

import crypto from "crypto";
import fs from "fs";

export interface FileHashes {
  sha256: string;
  md5: string;
  sizeBytes: number;
}

/**
 * Compute SHA-256 and MD5 of a file by streaming it.
 * Does NOT load the entire file into memory.
 */
export function computeFileHash(filePath: string): Promise<FileHashes> {
  return new Promise((resolve, reject) => {
    const sha256 = crypto.createHash("sha256");
    const md5 = crypto.createHash("md5");
    let sizeBytes = 0;

    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk: Buffer) => {
      sha256.update(chunk);
      md5.update(chunk);
      sizeBytes += chunk.length;
    });

    stream.on("end", () => {
      resolve({
        sha256: sha256.digest("hex"),
        md5: md5.digest("hex"),
        sizeBytes,
      });
    });

    stream.on("error", (err) => {
      reject(new Error(`[FileHasher] Failed to hash "${filePath}": ${err.message}`));
    });
  });
}

/**
 * Verify a file against an expected hash.
 * Returns true if the file matches the expected hash.
 */
export async function verifyFileHash(
  filePath: string,
  expected: { sha256?: string; md5?: string }
): Promise<boolean> {
  const actual = await computeFileHash(filePath);
  if (expected.sha256 && actual.sha256 !== expected.sha256) return false;
  if (expected.md5 && actual.md5 !== expected.md5) return false;
  return true;
}
