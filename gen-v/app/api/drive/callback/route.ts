import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import crypto from "crypto";
import { DriveConnectionManager } from "@/lib/drive/DriveConnectionManager";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const origin = req.nextUrl.origin || "http://localhost:3000";

  if (!code || !stateParam) {
    return NextResponse.redirect(`${origin}/settings?error=missing_oauth_params`);
  }

  try {
    const rawState = Buffer.from(stateParam, "base64").toString("utf-8");
    const stateObj = JSON.parse(rawState);
    const { uid: userId, nonce, hmac, t } = stateObj as {
      uid?: string;
      nonce?: string;
      hmac?: string;
      t?: number;
    };

    if (!userId) {
      return NextResponse.redirect(`${origin}/settings?error=invalid_state`);
    }

    // Verify HMAC-bound state + HttpOnly cookie binding (prevents IDOR: attacker cannot forge uid)
    const secret = process.env.OAUTH_STATE_SECRET || process.env.INTERNAL_API_SECRET_KEY || "";
    if (secret && nonce && hmac) {
      const expectedHmac = crypto.createHmac("sha256", secret).update(`${nonce}:${userId}`).digest("hex");
      const cookieNonce = req.cookies.get("oauth_state")?.value;
      const hmacOk =
        hmac.length === expectedHmac.length &&
        crypto.timingSafeEqual(Buffer.from(hmac, "utf-8"), Buffer.from(expectedHmac, "utf-8"));
      const cookieOk = cookieNonce ? cookieNonce === nonce : true; // allow missing cookie for cross-browser flows but log
      if (!cookieNonce) {
        console.warn("[OAuth Callback] oauth_state cookie missing — skipping cookie binding check (cross-site or expired cookie).");
      }
      if (!hmacOk || !cookieOk) {
        console.warn("[OAuth Callback] State verification failed (HMAC or cookie mismatch).");
        return NextResponse.redirect(`${origin}/settings?error=invalid_state`);
      }
      // Optional: expire old state (10 min)
      if (typeof t === "number" && Date.now() - t > 10 * 60 * 1000) {
        console.warn("[OAuth Callback] State expired.");
        return NextResponse.redirect(`${origin}/settings?error=invalid_state`);
      }
    } else if (secret) {
      // New flow expected but state is legacy (no nonce/hmac) — reject to prevent downgrade
      console.warn("[OAuth Callback] Legacy state without HMAC received while OAUTH_STATE_SECRET is set — rejecting.");
      return NextResponse.redirect(`${origin}/settings?error=invalid_state`);
    } else {
      console.warn("[OAuth Callback] OAUTH_STATE_SECRET/INTERNAL_API_SECRET_KEY not set — state verification skipped.");
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = `${origin}/api/drive/callback`;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.warn(`[OAuth Callback] No refresh token returned. User may have already authorized. Re-prompt consent.`);
    }

    // Get userinfo to know connected Google email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    let googleEmail = "";
    try {
      const userInfo = await oauth2.userinfo.get();
      googleEmail = userInfo.data.email || "";
    } catch {}

    if (tokens.refresh_token) {
      await DriveConnectionManager.saveUserDriveConnection(userId, {
        refreshToken: tokens.refresh_token,
        googleEmail,
        clientId,
        clientSecret,
        selectedFolderName: "ShortFactory / AI Shorts",
      });
    }

    return NextResponse.redirect(`${origin}/settings?drive=connected`);
  } catch (err: any) {
    console.error("[Drive OAuth Callback Error]:", err.message);
    return NextResponse.redirect(`${origin}/settings?error=oauth_failed`);
  }
}
