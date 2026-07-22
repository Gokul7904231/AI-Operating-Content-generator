/**
 * POST /api/storage/rotate-key
 * Body: { newKeyPath: string, deleteOld?: boolean }
 *
 * Hot-swap the Google Service Account key without server restart.
 * Protected by INTERNAL_API_SECRET_KEY.
 *
 * GET /api/storage/rotate-key
 * Returns: current key info + available keys in credentials/
 */
import { NextResponse } from "next/server";
import "../../../../storage/index";
import { KeyRotation } from "../../../../storage/key-rotation";

function checkAuth(req: Request): boolean {
  const key = process.env.INTERNAL_API_SECRET_KEY;
  if (!key) return true; // no key set → open in dev
  const header = req.headers.get("authorization");
  const qKey = new URL(req.url).searchParams.get("key");
  return header === `Bearer ${key}` || qKey === key;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const currentKey = KeyRotation.getCurrentKey();
    const availableKeys = KeyRotation.listAvailableKeys("credentials");
    return NextResponse.json({ success: true, currentKey, availableKeys });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { newKeyPath, deleteOld = false } = body ?? {};

    if (!newKeyPath) {
      return NextResponse.json({ error: "Missing newKeyPath" }, { status: 400 });
    }

    const result = await KeyRotation.rotateTo(String(newKeyPath), Boolean(deleteOld));

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
