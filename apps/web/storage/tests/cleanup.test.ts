/**
 * cleanup.test.ts
 *
 * Unit tests for the cleanup-drive utility.
 * Run with: npx jest storage/tests/cleanup.test.ts
 */

// Mock storage index to prevent auto-initialization
jest.mock("../index", () => ({}));

// Mock StorageRegistry
jest.mock("../storage-registry", () => ({
  StorageRegistry: {
    getProvider: jest.fn(),
    getPrimary: jest.fn(),
  },
}));

// Mock drive-store
jest.mock("../../lib/drive-store", () => ({
  getPendingCleanup: jest.fn(),
  markCleaned: jest.fn(),
}));

// Mock EventBus
jest.mock("../../ai/event-bus", () => ({
  EventBus: { publish: jest.fn() },
}));

import { runCleanup } from "../cleanup-drive";
import { StorageRegistry } from "../storage-registry";
import { getPendingCleanup, markCleaned } from "../../lib/drive-store";
import { EventBus } from "../../ai/event-bus";

const mockDelete = jest.fn();
const mockCleanup = jest.fn();

const mockProvider = {
  id: "google-drive",
  delete: mockDelete,
  cleanup: mockCleanup,
  list: jest.fn().mockResolvedValue([]),
};

beforeEach(() => {
  jest.clearAllMocks();
  (StorageRegistry.getProvider as jest.Mock).mockReturnValue(mockProvider);
  (getPendingCleanup as jest.Mock).mockResolvedValue([]);
  (markCleaned as jest.Mock).mockResolvedValue(undefined);
  mockDelete.mockResolvedValue(undefined);
  mockCleanup.mockResolvedValue({
    deletedCount: 0,
    failedCount: 0,
    deletedFileIds: [],
    failedFileIds: [],
    durationMs: 10,
    ranAt: new Date().toISOString(),
  });
});

describe("runCleanup()", () => {
  test("returns result with all required fields", async () => {
    const result = await runCleanup();
    expect(result).toHaveProperty("ranAt");
    expect(result).toHaveProperty("deleted");
    expect(result).toHaveProperty("failed");
    expect(result).toHaveProperty("skipped");
    expect(result).toHaveProperty("durationMs");
    expect(result).toHaveProperty("jobs");
    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test("deletes pending jobs from Firestore list", async () => {
    (getPendingCleanup as jest.Mock).mockResolvedValue([
      { jobId: "job1", driveFileId: "file1", driveUrl: "", downloadLink: "", driveUploadedAt: "", storageProvider: "google-drive", cleanupStatus: "pending", deleteAt: new Date().toISOString() },
      { jobId: "job2", driveFileId: "file2", driveUrl: "", downloadLink: "", driveUploadedAt: "", storageProvider: "google-drive", cleanupStatus: "pending", deleteAt: new Date().toISOString() },
    ]);

    const result = await runCleanup();
    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(markCleaned).toHaveBeenCalledTimes(2);
    expect(result.deleted).toBe(2);
    expect(result.failed).toBe(0);
  });

  test("counts failed deletions correctly", async () => {
    (getPendingCleanup as jest.Mock).mockResolvedValue([
      { jobId: "job1", driveFileId: "file1", driveUrl: "", downloadLink: "", driveUploadedAt: "", storageProvider: "google-drive", cleanupStatus: "pending", deleteAt: new Date().toISOString() },
    ]);
    mockDelete.mockRejectedValue(new Error("API Error"));

    const result = await runCleanup();
    expect(result.failed).toBe(1);
    expect(result.deleted).toBe(0);
    expect(result.jobs[0].status).toBe("failed");
  });

  test("skips jobs with no driveFileId", async () => {
    (getPendingCleanup as jest.Mock).mockResolvedValue([
      { jobId: "job-no-file", driveFileId: "", driveUrl: "", downloadLink: "", driveUploadedAt: "", storageProvider: "google-drive", cleanupStatus: "pending", deleteAt: new Date().toISOString() },
    ]);

    const result = await runCleanup();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });

  test("dry-run does not call delete", async () => {
    (getPendingCleanup as jest.Mock).mockResolvedValue([
      { jobId: "job1", driveFileId: "file1", driveUrl: "", downloadLink: "", driveUploadedAt: "", storageProvider: "google-drive", cleanupStatus: "pending", deleteAt: new Date().toISOString() },
    ]);

    const result = await runCleanup({ dryRun: true });
    expect(mockDelete).not.toHaveBeenCalled();
    expect(markCleaned).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.jobs[0].status).toBe("dry-run");
  });

  test("publishes cleanup.completed event (not in dry-run)", async () => {
    await runCleanup({ dryRun: false });
    expect(EventBus.publish).toHaveBeenCalledWith(
      "storage.cleanup.completed",
      expect.any(Object),
      expect.any(String)
    );
  });

  test("does NOT publish event in dry-run mode", async () => {
    await runCleanup({ dryRun: true });
    expect(EventBus.publish).not.toHaveBeenCalled();
  });

  test("durationMs is a positive number", async () => {
    const result = await runCleanup();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
