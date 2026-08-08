import { NextResponse } from "next/server";
import { verifySession } from "../../../../lib/auth/auth";
import { saveUserCredential, getUserCredentialsStatus } from "../../../../lib/auth/credentials";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/credentials
 * Returns registered BYOK provider status for authenticated user (masks key).
 * Enforces AES-256-GCM encryption-at-rest; raw key is NEVER returned in HTTP response or logged.
 */
export async function GET(req: Request) {
  try {
    const { user } = await verifySession(req);
    const providers = getUserCredentialsStatus(user.uid);

    return NextResponse.json({
      success: true,
      userId: user.uid,
      providers,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 401 });
  }
}

/**
 * POST /api/user/credentials
 * Encrypts user BYOK API key at rest using AES-256-GCM and stores encrypted blob.
 */
export async function POST(req: Request) {
  try {
    const { user } = await verifySession(req);
    const body = await req.json();
    const { provider = "google", apiKey } = body;

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Invalid or missing apiKey" }, { status: 400 });
    }

    const maskedKey = saveUserCredential(user.uid, provider, apiKey);

    return NextResponse.json({
      success: true,
      userId: user.uid,
      provider,
      maskedKey, // Only masked key returned
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 401 });
  }
}
