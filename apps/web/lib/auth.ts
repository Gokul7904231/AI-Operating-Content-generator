import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Initialize data directory and SQLite database (owner-only permissions)
const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
} else {
  try { fs.chmodSync(dataDir, 0o700); } catch {}
}

const dbPath = path.join(dataDir, "auth.db");
// Pre-create file with 0o600 so better-sqlite3 inherits restrictive perms
try {
  const fd = fs.openSync(dbPath, "a", 0o600);
  fs.closeSync(fd);
} catch {}
const db = new Database(dbPath);
try { fs.chmodSync(dbPath, 0o600); } catch {}
try { fs.chmodSync(dataDir, 0o700); } catch {}

// Detect any social providers configured in environment
const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});
