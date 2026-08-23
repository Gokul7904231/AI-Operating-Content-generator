import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import crypto from "crypto";
import { verifySession } from "@/lib/auth/auth";
import { can } from "@/lib/auth/capability-policy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await verifySession(req);
    if (!user || !can(user, "GOOGLE_DRIVE_CONNECT")) {
      return NextResponse.json(
        { error: "Connecting Google Drive is a Pro feature. Please upgrade your tier." },
        { status: 403 }
      );
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const origin = req.nextUrl.origin || "http://localhost:3000";
    const redirectUri = `${origin}/api/drive/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Google OAuth credentials unconfigured on control plane." },
        { status: 500 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // OAuth state: HMAC-bound nonce to prevent IDOR (attacker cannot forge uid)
    const secret = process.env.OAUTH_STATE_SECRET || process.env.INTERNAL_API_SECRET_KEY || "";
    const nonce = crypto.randomBytes(16).toString("hex");
    const hmac = secret
      ? crypto.createHmac("sha256", secret).update(`${nonce}:${user.uid}`).digest("hex")
      : "";
    if (!secret) {
      console.warn("[OAuth Connect] OAUTH_STATE_SECRET/INTERNAL_API_SECRET_KEY not set — state HMAC disabled.");
    }

    const state = JSON.stringify({
      uid: user.uid,
      nonce,
      hmac,
      t: Date.now(),
    });

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      state: Buffer.from(state).toString("base64"),
    });

    const res = NextResponse.json({ success: true, authUrl });
    // Bind nonce to HttpOnly cookie so callback can verify state was issued to this browser session
    res.cookies.set("oauth_state", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 min
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to initiate OAuth." }, { status: 500 });
  }
}
