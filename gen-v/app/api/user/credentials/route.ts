import { NextResponse } from "next/server";
import { verifySession } from "../../../../lib/auth/auth";

export const dynamic = "force-dynamic";

// In-memory store for user API keys (scoped by UID)
const userKeyStore = new Map<string, Record<string, string>>();

/**
 * GET /api/user/credentials
 * Returns registered BYOK provider status for authenticated user (masks key).
 */
export async function GET(req: Request) {
  try {
    const { user } = await verifySession(req);
    const keys = userKeyStore.get(user.uid) || {};

    const safeProviders: Record<string, { configured: boolean; maskedKey?: string }> = {};
    for (const [provider, key] of Object.entries(keys)) {
      safeProviders[provider] = {
        configured: true,
        maskedKey: key ? `${key.slice(0, 4)}...${key.slice(-4)}` : undefined,
      };
    }

    return NextResponse.json({
      success: true,
      userId: user.uid,
      providers: safeProviders,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 401 });
  }
}

/**
 * POST /api/user/credentials
 * Saves user BYOK API key (e.g. Google Gemini key).
 */
export async function POST(req: Request) {
  try {
    const { user } = await verifySession(req);
    const body = await req.json();
    const { provider = "google", apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Invalid or missing apiKey" }, { status: 400 });
    }

    const keys = userKeyStore.get(user.uid) || {};
    keys[provider] = apiKey;
    userKeyStore.set(user.uid, keys);

    return NextResponse.json({
      success: true,
      userId: user.uid,
      provider,
      maskedKey: `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 401 });
  }
}
