import { NextRequest, NextResponse } from "next/server";
import { verifyAuthAndRole } from "../../../../lib/auth/auth";
import { db } from "../../../../lib/firebase-admin";
import { UserRole } from "../../../../lib/auth/types";
import { isValidRole } from "../../../../lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * Lists all registered users and their assigned roles. (ADMIN only)
 */
export async function GET(request: NextRequest) {
  try {
    const caller = await verifyAuthAndRole(request, "ADMIN");

    const users: any[] = [];

    if (db) {
      const snapshot = await db.collection("admins").get();
      snapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
    } else {
      // Mock Store Fallback
      users.push({
        uid: "mock_owner_uid",
        email: "gokul32499@gmail.com",
        role: "OWNER",
        active: true,
        disabled: false,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, callerRole: caller.role, users });
  } catch (err: any) {
    const isForbidden = err.message?.includes("Forbidden") || err.message?.includes("Role");
    const status = isForbidden ? 403 : 401;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

/**
 * PATCH /api/admin/users
 * Update a user's role or disabled status. (OWNER only)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Role management is strictly restricted to OWNER
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

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (role) updates.role = role as UserRole;
    if (typeof disabled === "boolean") updates.disabled = disabled;

    if (db) {
      await db.collection("admins").doc(uid).update(updates);
    }

    return NextResponse.json({
      success: true,
      message: `User ${uid} updated successfully.`,
      updates,
    });
  } catch (err: any) {
    const isForbidden = err.message?.includes("Forbidden") || err.message?.includes("Role");
    const status = isForbidden ? 403 : 401;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
