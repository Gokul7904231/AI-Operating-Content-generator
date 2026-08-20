/**
 * Canonical User Repository — FactoryOS v1
 * 
 * Supports Firestore collection ("users" / "admins") with persistent local/test store fallback.
 * Strictly guarantees that passwordHash and passwordSalt are never exposed in user listings.
 */

import { db } from "./firebase-admin";
import { UserAccount, SafeUser, UserRole, UserStatus } from "./types";
import { ALLOWED_BOOTSTRAP_OWNER_EMAIL } from "./constants";
import crypto from "crypto";

// Fallback in-memory / persistent mock store for dev & test suites
const localUsersStore = new Map<string, UserAccount>();

// Pre-seed mock store with initial Owner if empty
if (!localUsersStore.has("mock_owner_uid")) {
  localUsersStore.set("mock_owner_uid", {
    id: "mock_owner_uid",
    email: ALLOWED_BOOTSTRAP_OWNER_EMAIL,
    normalizedEmail: ALLOWED_BOOTSTRAP_OWNER_EMAIL.toLowerCase().trim(),
    name: "System Owner",
    passwordHash: "mock_hash_owner",
    passwordSalt: "mock_salt_owner",
    role: "OWNER",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  });
}

/**
 * Sanitizes a UserAccount record to a SafeUser by removing password hashes and salts.
 */
export function toSafeUser(user: UserAccount): SafeUser {
  const { passwordHash, passwordSalt, ...rest } = user;
  return {
    ...rest,
    uid: user.id,
    active: user.status === "ACTIVE",
    disabled: user.status === "DISABLED",
  };
}

/**
 * Normalizes an email address for lookup (trim + lowercase).
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== "string") return "";
  return email.toLowerCase().trim();
}

export class UserRepository {
  /**
   * Look up user by normalized email address.
   */
  static async findByNormalizedEmail(normalizedEmail: string): Promise<UserAccount | null> {
    const cleanEmail = normalizeEmail(normalizedEmail);
    if (!cleanEmail) return null;

    if (db) {
      try {
        const snapshot = await db.collection("users").where("normalizedEmail", "==", cleanEmail).limit(1).get();
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return { id: doc.id, ...(doc.data() as any) } as UserAccount;
        }

        // Check fallback admins collection for backwards compatibility
        const adminSnapshot = await db.collection("admins").where("email", "==", cleanEmail).limit(1).get();
        if (!adminSnapshot.empty) {
          const doc = adminSnapshot.docs[0];
          const data = doc.data() as any;
          return {
            id: doc.id,
            email: data.email,
            normalizedEmail: cleanEmail,
            name: data.name,
            passwordHash: data.passwordHash || "",
            passwordSalt: data.passwordSalt || "",
            role: data.role || "ADMIN",
            status: data.disabled ? "DISABLED" : "ACTIVE",
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            lastLoginAt: data.lastLogin,
          };
        }
      } catch (err: any) {
        console.error("[UserRepository] Firestore lookup error:", err.message);
      }
    }

    // Fallback in-memory lookup
    for (const user of localUsersStore.values()) {
      if (user.normalizedEmail === cleanEmail || user.email.toLowerCase().trim() === cleanEmail) {
        return { ...user };
      }
    }

    return null;
  }

  /**
   * Look up user by ID.
   */
  static async findById(id: string): Promise<UserAccount | null> {
    if (!id) return null;

    if (db) {
      try {
        const doc = await db.collection("users").doc(id).get();
        if (doc.exists) {
          return { id: doc.id, ...(doc.data() as any) } as UserAccount;
        }

        const adminDoc = await db.collection("admins").doc(id).get();
        if (adminDoc.exists) {
          const data = adminDoc.data() as any;
          return {
            id: adminDoc.id,
            email: data.email,
            normalizedEmail: normalizeEmail(data.email),
            name: data.name,
            passwordHash: data.passwordHash || "",
            passwordSalt: data.passwordSalt || "",
            role: data.role || "ADMIN",
            status: data.disabled ? "DISABLED" : "ACTIVE",
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            lastLoginAt: data.lastLogin,
          };
        }
      } catch (err: any) {
        console.error("[UserRepository] Firestore findById error:", err.message);
      }
    }

    const localUser = localUsersStore.get(id);
    return localUser ? { ...localUser } : null;
  }

  /**
   * Creates a new user record.
   */
  static async create(userData: {
    email: string;
    passwordHash: string;
    passwordSalt: string;
    name?: string;
    role?: UserRole;
    status?: UserStatus;
  }): Promise<UserAccount> {
    const id = `usr_${crypto.randomBytes(12).toString("hex")}`;
    const cleanEmail = normalizeEmail(userData.email);
    const now = new Date().toISOString();

    const newUser: UserAccount = {
      id,
      email: userData.email.trim(),
      normalizedEmail: cleanEmail,
      name: userData.name?.trim(),
      passwordHash: userData.passwordHash,
      passwordSalt: userData.passwordSalt,
      role: userData.role || "USER",
      status: userData.status || "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };

    if (db) {
      try {
        await db.collection("users").doc(id).set(newUser);
      } catch (err: any) {
        console.error("[UserRepository] Firestore create error:", err.message);
      }
    }

    localUsersStore.set(id, { ...newUser });
    return newUser;
  }

  /**
   * Updates an existing user record.
   */
  static async update(id: string, updates: Partial<UserAccount>): Promise<UserAccount | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: UserAccount = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (db) {
      try {
        await db.collection("users").doc(id).set(updated, { merge: true });
      } catch (err: any) {
        console.error("[UserRepository] Firestore update error:", err.message);
      }
    }

    localUsersStore.set(id, { ...updated });
    return updated;
  }

  /**
   * Lists all users for the Admin Directory (strictly sanitized, newest first).
   */
  static async listAll(): Promise<SafeUser[]> {
    const usersList: SafeUser[] = [];

    if (db) {
      try {
        const snapshot = await db.collection("users").orderBy("createdAt", "desc").get();
        if (!snapshot.empty) {
          snapshot.forEach((doc) => {
            const data = doc.data() as UserAccount;
            usersList.push(toSafeUser({ ...data, id: doc.id }));
          });
          return usersList;
        }
      } catch (err: any) {
        console.error("[UserRepository] Firestore listAll error:", err.message);
      }
    }

    // Fallback store
    for (const user of localUsersStore.values()) {
      usersList.push(toSafeUser(user));
    }

    return usersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Test helper to clear mock storage in vitest suites.
   */
  static _resetForTesting(): void {
    localUsersStore.clear();
    localUsersStore.set("mock_owner_uid", {
      id: "mock_owner_uid",
      email: ALLOWED_BOOTSTRAP_OWNER_EMAIL,
      normalizedEmail: ALLOWED_BOOTSTRAP_OWNER_EMAIL.toLowerCase().trim(),
      name: "System Owner",
      passwordHash: "mock_hash_owner",
      passwordSalt: "mock_salt_owner",
      role: "OWNER",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });
  }
}
