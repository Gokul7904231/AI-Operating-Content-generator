/**
 * storage-provider.test.ts
 *
 * Unit tests for the StorageRegistry and StorageProvider interface.
 * Run with: npx jest storage/tests/storage-provider.test.ts
 */

import { StorageRegistry } from "../storage-registry";
import type { StorageProvider } from "../storage-provider";
import type {
  UploadResult,
  DownloadResult,
  StorageItem,
  StorageHealthReport,
  StorageTelemetryRecord,
  CleanupResult,
} from "../types";

// ── Mock Provider Factory ─────────────────────────────────────────────────────

function createMockProvider(id: string, healthy = true): StorageProvider {
  return {
    id,
    name: `Mock ${id}`,
    type: "cloud",

    upload: jest.fn().mockResolvedValue({
      fileId: `file_${id}_123`,
      fileName: "test.mp4",
      url: `https://mock.test/${id}/test.mp4`,
      mimeType: "video/mp4",
      sizeBytes: 1024 * 1024,
      createdAt: new Date().toISOString(),
      provider: id,
    } as UploadResult),

    download: jest.fn().mockResolvedValue({
      data: Buffer.from("mock-data"),
      mimeType: "video/mp4",
      sizeBytes: 1024,
      fileName: "test.mp4",
    } as DownloadResult),

    delete: jest.fn().mockResolvedValue(undefined),

    list: jest.fn().mockResolvedValue([
      {
        fileId: `file_${id}_1`,
        fileName: "video1.mp4",
        mimeType: "video/mp4",
        sizeBytes: 10_000_000,
        createdAt: new Date().toISOString(),
        provider: id,
      },
    ] as StorageItem[]),

    getMetadata: jest.fn().mockResolvedValue({
      fileId: `file_${id}_1`,
      fileName: "video1.mp4",
      mimeType: "video/mp4",
      sizeBytes: 10_000_000,
      createdAt: new Date().toISOString(),
      provider: id,
    } as StorageItem),

    health: jest.fn().mockResolvedValue(healthy),

    healthCheck: jest.fn().mockResolvedValue({
      provider: id,
      state: healthy ? "ONLINE" : "OFFLINE",
      reachable: healthy,
      credentialsOk: healthy,
      folderExists: healthy,
      uploadPermission: healthy,
      latencyMs: 50,
      usedBytes: 1_073_741_824,
      quotaBytes: 15_000_000_000,
      checkedAt: new Date().toISOString(),
    } as StorageHealthReport),

    cleanup: jest.fn().mockResolvedValue({
      deletedCount: 1,
      failedCount: 0,
      deletedFileIds: [`file_${id}_old`],
      failedFileIds: [],
      durationMs: 100,
      ranAt: new Date().toISOString(),
    } as CleanupResult),

    supportsSignedUrls: () => false,
    supportsStreaming: () => true,
    supportsAutoDelete: () => false,
    getTelemetry: () => [] as StorageTelemetryRecord[],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// Reset registry between tests by creating a fresh instance
let testRegistry: any;

beforeEach(() => {
  // Directly access private members for test isolation
  (StorageRegistry as any).providers = new Map();
  (StorageRegistry as any).primaryId = null;
});

describe("StorageRegistry", () => {
  test("registers a provider and makes it primary", () => {
    const mock = createMockProvider("test-drive");
    StorageRegistry.register(mock);

    expect(StorageRegistry.hasProvider("test-drive")).toBe(true);
    expect(StorageRegistry.getPrimary().id).toBe("test-drive");
  });

  test("second registered provider does not override primary", () => {
    const m1 = createMockProvider("drive");
    const m2 = createMockProvider("cloudinary");
    StorageRegistry.register(m1);
    StorageRegistry.register(m2);

    expect(StorageRegistry.getPrimary().id).toBe("drive");
  });

  test("setPrimary changes the active primary", () => {
    const m1 = createMockProvider("drive");
    const m2 = createMockProvider("cloudinary");
    StorageRegistry.register(m1);
    StorageRegistry.register(m2);
    StorageRegistry.setPrimary("cloudinary");

    expect(StorageRegistry.getPrimary().id).toBe("cloudinary");
  });

  test("getProvider throws for unknown IDs", () => {
    expect(() => StorageRegistry.getProvider("nonexistent")).toThrow();
  });

  test("getAllProviders returns all registered providers", () => {
    StorageRegistry.register(createMockProvider("a"));
    StorageRegistry.register(createMockProvider("b"));
    StorageRegistry.register(createMockProvider("c"));

    expect(StorageRegistry.getAllProviders()).toHaveLength(3);
  });

  test("hasProvider returns correct boolean", () => {
    StorageRegistry.register(createMockProvider("present"));
    expect(StorageRegistry.hasProvider("present")).toBe(true);
    expect(StorageRegistry.hasProvider("absent")).toBe(false);
  });
});

describe("StorageProvider interface contract", () => {
  let mock: StorageProvider;

  beforeEach(() => {
    mock = createMockProvider("mock");
  });

  test("upload returns a complete UploadResult", async () => {
    const result = await mock.upload("/tmp/video.mp4");
    expect(result.fileId).toBeTruthy();
    expect(result.fileName).toBeTruthy();
    expect(result.url).toBeTruthy();
    expect(result.mimeType).toBeTruthy();
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.createdAt).toBeTruthy();
    expect(result.provider).toBe("mock");
  });

  test("download returns data stream or buffer", async () => {
    const result = await mock.download("file_123");
    expect(result.data).toBeTruthy();
    expect(result.mimeType).toBeTruthy();
    expect(result.fileName).toBeTruthy();
  });

  test("delete resolves without throwing", async () => {
    await expect(mock.delete("file_123")).resolves.not.toThrow();
  });

  test("list returns array of StorageItems", async () => {
    const items = await mock.list();
    expect(Array.isArray(items)).toBe(true);
    if (items.length > 0) {
      expect(items[0].fileId).toBeTruthy();
      expect(items[0].provider).toBeTruthy();
    }
  });

  test("health returns boolean", async () => {
    const h = await mock.health();
    expect(typeof h).toBe("boolean");
  });

  test("healthCheck returns complete report", async () => {
    const report = await mock.healthCheck();
    expect(report.provider).toBeTruthy();
    expect(report.state).toBeTruthy();
    expect(typeof report.reachable).toBe("boolean");
    expect(typeof report.credentialsOk).toBe("boolean");
    expect(typeof report.latencyMs).toBe("number");
  });

  test("cleanup returns CleanupResult", async () => {
    const result = await mock.cleanup(72 * 3_600_000);
    expect(typeof result.deletedCount).toBe("number");
    expect(typeof result.failedCount).toBe("number");
    expect(Array.isArray(result.deletedFileIds)).toBe(true);
  });

  test("capability flags return booleans", () => {
    expect(typeof mock.supportsSignedUrls()).toBe("boolean");
    expect(typeof mock.supportsStreaming()).toBe("boolean");
    expect(typeof mock.supportsAutoDelete()).toBe("boolean");
  });
});
