import { NextRequest, NextResponse } from "next/server";
import { verifyAuthAndRole } from "@/lib/auth/auth";
import { UserRepository } from "@/lib/auth/user-repository";
import { UserRole } from "@/lib/auth/types";
import { isValidRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * Lists all registered users (sanitized, newest first). Restricted to ADMIN and OWNER.
 */
export async function GET(request: NextRequest) {
  try {
    const caller = await verifyAuthAndRole(request, "ADMIN");
    const users = await UserRepository.listAll();

    return NextResponse.json({
      success: true,
      callerRole: caller.role,
      users,
    });
  } catch (err: any) {
    const isForbidden = err.message?.includes("Forbidden") || err.message?.includes("Insufficient permissions") || err.message?.includes("Access denied");
    const status = isForbidden ? 403 : 401;
    return NextResponse.json({ success: false, error: err.message || "Unauthorized" }, { status });
  }
}

/**
 * POST /api/admin/users
 * Grants/promotes an email address to ADMIN role with a specific allowed time duration.
 * Restricted to ADMIN and OWNER.
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await verifyAuthAndRole(request, "ADMIN");
    const body = await request.json();
    const { email, durationHours, durationMinutes, isPermanent } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "A valid email address is required." }, { status: 400 });
    }

    let durationMs: number | null = null;
    if (!isPermanent) {
      const hours = Number(durationHours) || 0;
      const minutes = Number(durationMinutes) || 0;
      const totalMinutes = hours * 60 + minutes;
      if (totalMinutes <= 0) {
        // Default to 24 hours if duration not provided and not permanent
        durationMs = 24 * 60 * 60 * 1000;
      } else {
        durationMs = totalMinutes * 60 * 1000;
      }
    }

    const updatedUser = await UserRepository.grantAdminRole({
      email: email.trim(),
      durationMs,
      grantedBy: caller.email,
    });

    const expiryInfo = durationMs
      ? `Access valid for ${durationHours ? `${durationHours}h ` : ""}${durationMinutes ? `${durationMinutes}m` : ""}`.trim()
      : "Permanent Admin access granted.";

    return NextResponse.json({
      success: true,
      message: `Admin access granted to ${email.trim()}. ${expiryInfo}`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        adminExpiresAt: updatedUser.adminExpiresAt,
        proxyAdminGrantedBy: updatedUser.proxyAdminGrantedBy,
        proxyAdminGrantedAt: updatedUser.proxyAdminGrantedAt,
      },
    });
  } catch (err: any) {
    const isForbidden = err.message?.includes("Forbidden") || err.message?.includes("Insufficient permissions") || err.message?.includes("Access denied");
    const status = isForbidden ? 403 : 401;
    return NextResponse.json({ success: false, error: err.message || "Unauthorized" }, { status });
  }
}

/**
 * PATCH /api/admin/users
 * Update a user's role, expiration, or disabled status. Restricted to ADMIN and OWNER.
 */
export async function PATCH(request: NextRequest) {
  try {
    const caller = await verifyAuthAndRole(request, "ADMIN");
    const body = await request.json();
    const { uid, role, disabled, adminExpiresAt, durationHours, isPermanent } = body;

    if (!uid || typeof uid !== "string") {
      return NextResponse.json({ success: false, error: "uid is required" }, { status: 400 });
    }

    if (role && !isValidRole(role)) {
      return NextResponse.json({ success: false, error: `Invalid role: ${role}` }, { status: 400 });
    }

    // Safety guard: prevent demoting or disabling self
    if (uid === caller.uid && (role !== caller.role || disabled === true)) {
      return NextResponse.json(
        { success: false, error: "Administrators cannot demote or disable their own account." },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (role) updates.role = role as UserRole;
    if (typeof disabled === "boolean") {
      updates.status = disabled ? "DISABLED" : "ACTIVE";
    }

    if (role === "ADMIN") {
      if (isPermanent) {
        updates.adminExpiresAt = null;
      } else if (durationHours) {
        updates.adminExpiresAt = new Date(Date.now() + Number(durationHours) * 60 * 60 * 1000).toISOString();
      } else if (adminExpiresAt !== undefined) {
        updates.adminExpiresAt = adminExpiresAt;
      }
      updates.proxyAdminGrantedBy = caller.email;
      updates.proxyAdminGrantedAt = new Date().toISOString();
    } else if (role && role !== "ADMIN") {
      updates.adminExpiresAt = null;
    }

    const updatedUser = await UserRepository.update(uid, updates);

    return NextResponse.json({
      success: true,
      message: `User ${uid} updated successfully.`,
      user: updatedUser ? { id: updatedUser.id, role: updatedUser.role, status: updatedUser.status, adminExpiresAt: updatedUser.adminExpiresAt } : null,
    });
  } catch (err: any) {
    const isForbidden = err.message?.includes("Forbidden") || err.message?.includes("Insufficient permissions") || err.message?.includes("Access denied");
    const status = isForbidden ? 403 : 401;
    return NextResponse.json({ success: false, error: err.message || "Unauthorized" }, { status });
  }
}
