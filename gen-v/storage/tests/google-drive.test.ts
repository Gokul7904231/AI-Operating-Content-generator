/**
 * google-drive.test.ts
 *
 * Unit tests for GoogleDriveStorageProvider with mocked googleapis.
 * Run with: npx jest storage/tests/google-drive.test.ts
 */

// Mock googleapis before imports
jest.mock("googleapis", () => {
  const mockDrive = {
    files: {
      create: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
    },
    permissions: {
      create: jest.fn(),
    },
    about: {
      get: jest.fn(),
    },
  };

  const mockGoogleAuth = jest.fn().mockImplementation(() => ({
    getClient: jest.fn(),
  }));

  const mockOAuth2 = jest.fn().mockImplementation(() => ({
    setCredentials: jest.fn(),
  }));

  return {
    google: {
      drive: jest.fn().mockReturnValue(mockDrive),
      auth: {
        GoogleAuth: mockGoogleAuth,
        OAuth2: mockOAuth2,
      },
    },
    __mockDrive: mockDrive,
  };
});

// Mock EventBus
jest.mock("../../ai/event-bus", () => ({
  EventBus: { publish: jest.fn() },
}));

// Mock fs
jest.mock("fs", () => ({
  existsSync: jest.fn().mockReturnValue(false), // no service account file → OAuth2 path
  statSync: jest.fn().mockReturnValue({ size: 5_000_000 }),
  createReadStream: jest.fn().mockReturnValue({}),
}));

import { GoogleDriveStorageProvider } from "../providers/google-drive";

// Get mock drive reference
const { __mockDrive: mockDrive } = require("googleapis") as any;

describe("GoogleDriveStorageProvider", () => {
  let provider: GoogleDriveStorageProvider;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set env vars for OAuth2 fallback
    process.env.GOOGLE_DRIVE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_DRIVE_CLIENT_SECRET = "test-secret";
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN = "test-refresh-token";
    process.env.GOOGLE_DRIVE_FOLDER_ID = "root-folder-id";

    provider = new GoogleDriveStorageProvider();
  });

  // ── Upload ─────────────────────────────────────────────────────────────────

  describe("upload()", () => {
    beforeEach(() => {
      // Mock folder list (none found → create)
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });
      // Mock folder create
      mockDrive.files.create
        .mockResolvedValueOnce({ data: { id: "year-folder-id" } })      // year
        .mockResolvedValueOnce({ data: { id: "date-folder-id" } })      // date
        .mockResolvedValueOnce({ data: {                                // file
          id: "file-123",
          name: "test-video.mp4",
          mimeType: "video/mp4",
          size: "5000000",
          createdTime: "2026-07-11T00:00:00Z",
          webViewLink: "https://drive.google.com/file/d/file-123/view",
          webContentLink: "https://drive.google.com/uc?export=download&id=file-123",
        }});
      // Mock permission set
      mockDrive.permissions.create.mockResolvedValue({ data: {} });
    });

    test("uploads a file and returns UploadResult", async () => {
      const result = await provider.upload("/tmp/test-video.mp4", {
        engine: "quiz",
      });

      expect(result.fileId).toBe("file-123");
      expect(result.fileName).toBe("test-video.mp4");
      expect(result.mimeType).toBe("video/mp4");
      expect(result.provider).toBe("google-drive");
      expect(result.viewLink).toContain("drive.google.com");
    });

    test("sets file permission after upload", async () => {
      await provider.upload("/tmp/test.mp4");
      expect(mockDrive.permissions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: "file-123",
          requestBody: { role: "reader", type: "anyone" },
        })
      );
    });

    test("publishes upload.started and upload.completed events", async () => {
      const { EventBus } = require("../../ai/event-bus");
      await provider.upload("/tmp/test.mp4");
      expect(EventBus.publish).toHaveBeenCalledWith(
        "storage.upload.started",
        expect.any(Object),
        expect.any(String)
      );
      expect(EventBus.publish).toHaveBeenCalledWith(
        "storage.upload.completed",
        expect.any(Object),
        expect.any(String)
      );
    });

    test("publishes upload.failed on error", async () => {
      mockDrive.files.create.mockRejectedValue(new Error("Network error"));
      const { EventBus } = require("../../ai/event-bus");

      await expect(provider.upload("/tmp/test.mp4")).rejects.toThrow("Network error");
      expect(EventBus.publish).toHaveBeenCalledWith(
        "storage.upload.failed",
        expect.any(Object),
        expect.any(String)
      );
    });
  });

  // ── Delete ─────────────────────────────────────────────────────────────────

  describe("delete()", () => {
    test("moves file to trash (not permanent delete)", async () => {
      mockDrive.files.update.mockResolvedValue({ data: {} });
      await provider.delete("file-to-trash");

      expect(mockDrive.files.update).toHaveBeenCalledWith({
        fileId: "file-to-trash",
        requestBody: { trashed: true },
      });
    });

    test("publishes delete.completed event", async () => {
      mockDrive.files.update.mockResolvedValue({ data: {} });
      const { EventBus } = require("../../ai/event-bus");
      await provider.delete("file-abc");
      expect(EventBus.publish).toHaveBeenCalledWith(
        "storage.delete.completed",
        expect.any(Object),
        expect.any(String)
      );
    });
  });

  // ── List ───────────────────────────────────────────────────────────────────

  describe("list()", () => {
    test("returns mapped StorageItems", async () => {
      mockDrive.files.list.mockResolvedValue({
        data: {
          files: [
            {
              id: "f1",
              name: "video.mp4",
              mimeType: "video/mp4",
              size: "10000",
              createdTime: "2026-07-01T00:00:00Z",
              webViewLink: "https://drive.google.com/file/d/f1/view",
              webContentLink: "https://drive.google.com/uc?id=f1",
              parents: ["parent-folder"],
            },
          ],
        },
      });

      const items = await provider.list({ folderId: "some-folder" });
      expect(items).toHaveLength(1);
      expect(items[0].fileId).toBe("f1");
      expect(items[0].provider).toBe("google-drive");
    });
  });

  // ── Health ─────────────────────────────────────────────────────────────────

  describe("healthCheck()", () => {
    test("returns ONLINE when Drive is reachable", async () => {
      mockDrive.about.get.mockResolvedValue({
        data: { storageQuota: { usage: "1073741824", limit: "16106127360" } },
      });
      mockDrive.files.get.mockResolvedValue({ data: { id: "root-folder-id" } });

      const report = await provider.healthCheck();
      expect(report.reachable).toBe(true);
      expect(report.credentialsOk).toBe(true);
      expect(report.state).toBe("ONLINE");
      expect(report.usedBytes).toBe(1073741824);
    });

    test("returns AUTH_FAILED when Drive API throws", async () => {
      mockDrive.about.get.mockRejectedValue(new Error("401 Unauthorized"));
      const report = await provider.healthCheck();
      expect(report.state).toBe("AUTH_FAILED");
      expect(report.reachable).toBe(false);
    });
  });

  // ── Capability flags ───────────────────────────────────────────────────────

  describe("capability flags", () => {
    test("supportsStreaming is true", () => {
      expect(provider.supportsStreaming()).toBe(true);
    });
    test("supportsSignedUrls is false (public link)", () => {
      expect(provider.supportsSignedUrls()).toBe(false);
    });
    test("supportsAutoDelete is false (manual cleanup)", () => {
      expect(provider.supportsAutoDelete()).toBe(false);
    });
  });

  // ── Telemetry ──────────────────────────────────────────────────────────────

  describe("getTelemetry()", () => {
    test("returns array", () => {
      const t = provider.getTelemetry();
      expect(Array.isArray(t)).toBe(true);
    });
  });
});
