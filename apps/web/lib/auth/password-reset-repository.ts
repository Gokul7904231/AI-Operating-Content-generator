/**
 * Password Reset Challenge Repository — FactoryOS v1
 * 
 * Manages one-time password (OTP) verification challenges and short-lived reset authorization tokens.
 * Strictly guarantees that raw OTPs and raw reset tokens are never stored in plaintext.
 */

import { db } from "./firebase-admin";
import { PasswordResetChallenge } from "./types";
import { normalizeEmail } from "./user-repository";
import crypto from "crypto";

const localResetStore = new Map<string, PasswordResetChallenge>();

export class PasswordResetRepository {
  /**
   * Creates a new reset challenge and invalidates any previous active challenges for this email.
   */
  static async createChallenge(params: {
    userId: string;
    email: string;
    otpHash: string;
    expiresAt: number;
    maxAttempts?: number;
  }): Promise<PasswordResetChallenge> {
    const cleanEmail = normalizeEmail(params.email);
    const id = `rst_${crypto.randomBytes(12).toString("hex")}`;
    const now = new Date().toISOString();

    // 1. Invalidate any existing challenges for this user/email
    await this.invalidateAllForUser(params.userId);

    const challenge: PasswordResetChallenge = {
      id,
      userId: params.userId,
      email: params.email.trim(),
      normalizedEmail: cleanEmail,
      otpHash: params.otpHash,
      createdAt: now,
      expiresAt: params.expiresAt,
      attempts: 0,
      maxAttempts: params.maxAttempts || 5,
    };

    if (db) {
      try {
        await db.collection("password_resets").doc(id).set(challenge);
      } catch (err: any) {
        console.error("[PasswordResetRepository] Firestore create error:", err.message);
      }
    }

    localResetStore.set(id, { ...challenge });
    return challenge;
  }

  /**
   * Finds the latest active unconsumed reset challenge for a normalized email.
   */
  static async findActiveByNormalizedEmail(normalizedEmail: string): Promise<PasswordResetChallenge | null> {
    const cleanEmail = normalizeEmail(normalizedEmail);
    if (!cleanEmail) return null;

    if (db) {
      try {
        const snapshot = await db
          .collection("password_resets")
          .where("normalizedEmail", "==", cleanEmail)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return { id: doc.id, ...(doc.data() as any) } as PasswordResetChallenge;
        }
      } catch (err: any) {
        console.error("[PasswordResetRepository] Firestore lookup error:", err.message);
      }
    }

    // Fallback store lookup (find most recent unconsumed challenge)
    const matches: PasswordResetChallenge[] = [];
    for (const challenge of localResetStore.values()) {
      if (challenge.normalizedEmail === cleanEmail && !challenge.consumedAt) {
        matches.push(challenge);
      }
    }

    if (matches.length === 0) return null;
    matches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { ...matches[0] };
  }

  /**
   * Increments the attempt counter for a challenge.
   */
  static async incrementAttempts(id: string): Promise<PasswordResetChallenge | null> {
    let challenge = localResetStore.get(id);

    if (db) {
      try {
        const docRef = db.collection("password_resets").doc(id);
        const doc = await docRef.get();
        if (doc.exists) {
          const current = doc.data() as PasswordResetChallenge;
          const updated = {
            ...current,
            attempts: (current.attempts || 0) + 1,
          };
          await docRef.set(updated, { merge: true });
          localResetStore.set(id, updated);
          return updated;
        }
      } catch (err: any) {
        console.error("[PasswordResetRepository] Firestore increment error:", err.message);
      }
    }

    if (challenge) {
      challenge = { ...challenge, attempts: challenge.attempts + 1 };
      localResetStore.set(id, challenge);
      return challenge;
    }

    return null;
  }

  /**
   * Marks OTP consumed and issues a reset authorization token hash.
   */
  static async markConsumedWithResetToken(
    id: string,
    resetTokenHash: string,
    resetTokenExpiresAt: number
  ): Promise<PasswordResetChallenge | null> {
    const now = new Date().toISOString();
    let challenge = localResetStore.get(id);

    const updates = {
      consumedAt: now,
      resetTokenHash,
      resetTokenExpiresAt,
    };

    if (db) {
      try {
        const docRef = db.collection("password_resets").doc(id);
        await docRef.set(updates, { merge: true });
        const doc = await docRef.get();
        if (doc.exists) {
          const updated = { id: doc.id, ...(doc.data() as any) } as PasswordResetChallenge;
          localResetStore.set(id, updated);
          return updated;
        }
      } catch (err: any) {
        console.error("[PasswordResetRepository] Firestore markConsumed error:", err.message);
      }
    }

    if (challenge) {
      const updated = { ...challenge, ...updates };
      localResetStore.set(id, updated);
      return updated;
    }

    return null;
  }

  /**
   * Finds challenge matching a reset token hash.
   */
  static async findByResetTokenHash(resetTokenHash: string): Promise<PasswordResetChallenge | null> {
    if (!resetTokenHash) return null;

    if (db) {
      try {
        const snapshot = await db
          .collection("password_resets")
          .where("resetTokenHash", "==", resetTokenHash)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return { id: doc.id, ...(doc.data() as any) } as PasswordResetChallenge;
        }
      } catch (err: any) {
        console.error("[PasswordResetRepository] Firestore findByToken error:", err.message);
      }
    }

    for (const challenge of localResetStore.values()) {
      if (challenge.resetTokenHash === resetTokenHash) {
        return { ...challenge };
      }
    }

    return null;
  }

  /**
   * Invalidates all reset challenges for a user upon password reset or new challenge creation.
   */
  static async invalidateAllForUser(userId: string): Promise<void> {
    if (!userId) return;

    if (db) {
      try {
        const snapshot = await db.collection("password_resets").where("userId", "==", userId).get();
        const batch = db.batch();
        snapshot.forEach((doc) => {
          batch.update(doc.ref, {
            consumedAt: new Date().toISOString(),
            resetTokenExpiresAt: 0,
          });
        });
        await batch.commit();
      } catch (err: any) {
        console.error("[PasswordResetRepository] Firestore invalidateAll error:", err.message);
      }
    }

    for (const [id, challenge] of localResetStore.entries()) {
      if (challenge.userId === userId) {
        localResetStore.set(id, {
          ...challenge,
          consumedAt: new Date().toISOString(),
          resetTokenExpiresAt: 0,
        });
      }
    }
  }

  /**
   * Test helper to reset mock store in vitest.
   */
  static _resetForTesting(): void {
    localResetStore.clear();
  }
}
