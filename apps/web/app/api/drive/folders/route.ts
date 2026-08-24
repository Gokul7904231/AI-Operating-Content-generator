/**
 * GET /api/drive/folders
 *
 * Returns the ShortFactory folder tree from Google Drive.
 * Lists top-level folders under the configured root, then one level deep.
 */
import { NextResponse } from "next/server";
import "../../../../storage/index";
import { GoogleDriveProvider } from "../../../../storage/providers/google-drive";

export async function GET() {
  try {
    const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID ?? process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    if (!rootId) {
      return NextResponse.json(
        { error: "GOOGLE_DRIVE_FOLDER_ID is not configured" },
        { status: 503 }
      );
    }

    // List subfolders under root
    const files = await GoogleDriveProvider.list({
      folderId: rootId,
      mimeTypeFilter: "application/vnd.google-apps.folder",
      limit: 100,
    });

    // Enrich each top-level folder with its child count
    const tree = await Promise.allSettled(
      files.map(async (folder) => {
        const children = await GoogleDriveProvider.list({
          folderId: folder.fileId,
          limit: 200,
        });
        return {
          ...folder,
          childCount: children.length,
          children: children.slice(0, 20), // preview first 20
        };
      })
    );

    const folders = tree
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    return NextResponse.json({
      success: true,
      rootId,
      folders,
      total: folders.length,
    });
  } catch (err: any) {
    console.error("[/api/drive/folders]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
