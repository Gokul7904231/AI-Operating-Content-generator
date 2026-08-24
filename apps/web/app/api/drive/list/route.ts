/**
 * GET /api/drive/list
 * Query params: folderId?, limit?, query?, mimeType?
 *
 * Lists files from Google Drive via the storage provider.
 */
import { NextResponse } from "next/server";
import "../../../../storage/index";
import { StorageRegistry } from "../../../../storage/storage-registry";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? 50);
    const query = searchParams.get("query") ?? undefined;
    const mimeTypeFilter = searchParams.get("mimeType") ?? undefined;

    const provider = StorageRegistry.getProvider("google-drive");
    const files = await provider.list({ folderId, limit, query, mimeTypeFilter });

    return NextResponse.json({ success: true, files, count: files.length });
  } catch (err: any) {
    console.error("[/api/drive/list]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
