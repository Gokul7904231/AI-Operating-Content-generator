import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/auth";
import { getUserQuota } from "@/lib/quota/quota-service";

export async function GET(req: Request) {
  try {
    let userId = "";
    let role = "USER";

    try {
      const { user } = await verifySession(req);
      if (user?.uid) {
        userId = user.uid;
        role = user.role || "USER";
      }
    } catch {}

    if (!userId) {
      userId = "anonymous";
    }

    const quota = await getUserQuota(userId, role);

    return NextResponse.json({
      plan: quota.tier,
      limit: quota.limit === Infinity ? 999999 : quota.limit,
      used: quota.totalUsed,
      remaining: quota.remaining === Infinity ? 999999 : quota.remaining,
      isUnlimited: quota.isUnlimited,
      isExceeded: quota.isExceeded,
    });
  } catch (err: any) {
    console.error("[API /api/account/generation-quota] Error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve quota information." },
      { status: 500 }
    );
  }
}
