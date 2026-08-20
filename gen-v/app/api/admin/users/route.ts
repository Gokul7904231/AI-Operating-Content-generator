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
    const isForbidden = err.message?.includes("Forbidden") || err.message?.includes("Insufficient permissions");
    const status = isForbidden ? 403 : 401;
    return NextResponse.json({ success: false, error: err.message || "Unauthorized" }, { status });
  }
}

/**
 * PATCH /api/admin/users
 * Update a user's role or disabled status. Restricted to OWNER.
 */
export async function PATCH(request: NextRequest) {
  try {
    const caller = await verifyAuthAndRole(request, "OWNER");
    const body = await request.json();
    const { uid, role, disabled } = body;

    if (!uid || typeof uid !== "string") {
      return NextResponse.json({ success: false, error: "uid is required" }, { status: 400 });
    }

    if (role && !isValidRole(role)) {
      return NextResponse.json({ success: false, error: `Invalid role: ${role}` }, { status: 400 });
    }

    // Safety guard: prevent demoting or disabling self
    if (uid === caller.uid && (role !== "OWNER" || disabled === true)) {
      return NextResponse.json(
        { success: false, error: "Owners cannot demote or disable their own account." },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (role) updates.role = role as UserRole;
    if (typeof disabled === "boolean") {
      updates.status = disabled ? "DISABLED" : "ACTIVE";
    }

    const updatedUser = await UserRepository.update(uid, updates);

    return NextResponse.json({
      success: true,
      message: `User ${uid} updated successfully.`,
      user: updatedUser ? { id: updatedUser.id, role: updatedUser.role, status: updatedUser.status } : null,
    });
  } catch (err: any) {
    const isForbidden = err.message?.includes("Forbidden") || err.message?.includes("Insufficient permissions");
    const status = isForbidden ? 403 : 401;
    return NextResponse.json({ success: false, error: err.message || "Unauthorized" }, { status });
  }
}
