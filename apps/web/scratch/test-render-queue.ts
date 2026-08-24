import { SQLiteRenderQueue, calculateRequestHash } from "../lib/core/SQLiteRenderQueue";
import { QueueProcessor } from "../lib/core/RenderQueueProcessor";
import { CheckpointDB } from "../lib/core/CheckpointDB";
import fs from "fs";
import path from "path";

async function runQueueTests() {
  console.log("=================================================");
  console.log("    COMMENCING RENDER QUEUE SYSTEM UNIT TESTS    ");
  console.log("=================================================");

  const queue = new SQLiteRenderQueue();
  (queue as any).db.exec("DELETE FROM render_jobs");

  // Test 1: Enqueue Job
  console.log("\n[Test 1] Testing Job Enqueue...");
  const jobId = `test_job_${Date.now()}`;
  const payload = { topic: "Space Travel", questions: 5, style: "educational" };
  const job = await queue.enqueue({
    jobId,
    payload,
    priority: 2,
    maxAttempts: 3,
  });

  console.log(` - Job enqueued. ID: ${job.id} | User JobId: ${job.jobId} | Status: ${job.status} | Priority: ${job.priority}`);
  if (job.status !== "queued") {
    throw new Error(`Expected status to be 'queued', got: ${job.status}`);
  }
  if (job.priority !== 2) {
    throw new Error(`Expected priority to be 2, got: ${job.priority}`);
  }
  console.log(" ✅ Job Enqueue passed.");

  // Test 2: Request Idempotency
  console.log("\n[Test 2] Testing Request Idempotency...");
  const duplicateJob = await queue.enqueue({
    jobId: `different_job_${Date.now()}`,
    payload, // Same payload as test 1
  });

  console.log(` - Duplicate JobId returned: ${duplicateJob.jobId} (Original: ${job.jobId})`);
  if (duplicateJob.jobId !== job.jobId) {
    throw new Error("Idempotency check failed: Duplicate payload resulted in a new job!");
  }
  console.log(" ✅ Request Idempotency passed.");

  // Test 3: Claim Job
  console.log("\n[Test 3] Testing Job Claiming...");
  const workerId = "test_worker_node_1";
  const claimed = await queue.claim(workerId);
  
  if (!claimed) {
    throw new Error("Failed to claim enqueued job.");
  }
  console.log(` - Job claimed. ID: ${claimed.id} | Worker: ${claimed.workerId} | Status: ${claimed.status} | Attempts: ${claimed.attempts}`);
  if (claimed.status !== "claimed") {
    throw new Error(`Expected status 'claimed', got: ${claimed.status}`);
  }
  if (claimed.workerId !== workerId) {
    throw new Error(`Expected workerId '${workerId}', got: ${claimed.workerId}`);
  }
  if (claimed.attempts !== 1) {
    throw new Error(`Expected attempts to be 1, got: ${claimed.attempts}`);
  }
  console.log(" ✅ Job Claiming passed.");

  // Test 4: Heartbeat & Progress updates
  console.log("\n[Test 4] Testing Heartbeat and Progress serialization...");
  await queue.heartbeat(claimed.id, workerId);
  
  const mockSagaState = { script: "This is a space script.", voicePath: "/temp/voice.wav" };
  await queue.updateProgress(claimed.id, "voice", 50.0, mockSagaState);

  const updated = await queue.getJob(claimed.jobId);
  if (!updated) throw new Error("Could not fetch job metadata");

  console.log(` - Updated Job progress: ${updated.status} | Progress: ${(queue as any).db.prepare("SELECT progress_percentage FROM render_jobs WHERE id = ?").get(claimed.id).progress_percentage}%`);
  const dbRow = (queue as any).db.prepare("SELECT step_progress_json FROM render_jobs WHERE id = ?").get(claimed.id);
  console.log(`   Serialized Saga state: ${dbRow.step_progress_json}`);
  
  if (updated.status !== "running") {
    throw new Error(`Expected status 'running', got: ${updated.status}`);
  }
  if (JSON.parse(dbRow.step_progress_json).voicePath !== "/temp/voice.wav") {
    throw new Error("Saga state serialization failed to persist output paths");
  }
  console.log(" ✅ Heartbeat & Progress updates passed.");

  // Test 5: Worker Crash & Heartbeat Eviction timeout
  console.log("\n[Test 5] Testing Worker Timeout eviction & Exponential Backoff delay...");
  
  // Backdate heartbeat_at of current job to simulate worker crash (40 seconds ago)
  const pastTime = Date.now() - 40000;
  (queue as any).db.prepare(`
    UPDATE render_jobs
    SET heartbeat_at = ?
    WHERE id = ?
  `).run(pastTime, claimed.id);

  // Run eviction (threshold is 30 seconds)
  await queue.evictStaleJobs(30000);

  const evictedJob = await queue.getJob(claimed.jobId);
  if (!evictedJob) throw new Error("Could not fetch evicted job");

  console.log(` - Evicted Job Status: ${evictedJob.status} | Attempts: ${evictedJob.attempts}`);
  
  if (evictedJob.status !== "retrying") {
    throw new Error(`Expected job status to transition to 'retrying' after worker crash, got: ${evictedJob.status}`);
  }

  // Check exponential backoff delay time
  const row = (queue as any).db.prepare("SELECT next_retry_at FROM render_jobs WHERE id = ?").get(claimed.id);
  const delaySec = Math.round((row.next_retry_at - Date.now()) / 1000);
  console.log(`   Next retry scheduled in: ${delaySec}s (attempt 1 fail backoff calculated delay)`);
  
  if (delaySec < 0) {
    throw new Error("Exponential backoff retry time is in the past!");
  }
  console.log(" ✅ Worker Timeout eviction passed.");

  // Test 6: Permanent Failure
  console.log("\n[Test 6] Testing Permanent Failure when attempts exceed maxAttempts...");
  
  // Claim and fail twice more to exceed maxAttempts (3)
  // Attempt 2
  (queue as any).db.prepare("UPDATE render_jobs SET next_retry_at = ? WHERE id = ?").run(Date.now() - 1000, claimed.id);
  const claimed2 = await queue.claim(workerId);
  if (!claimed2) throw new Error("Could not claim job for attempt 2");
  await queue.fail(claimed2.id, "Second attempt failed", 0);
  
  // Attempt 3
  (queue as any).db.prepare("UPDATE render_jobs SET next_retry_at = ? WHERE id = ?").run(Date.now() - 1000, claimed.id);
  const claimed3 = await queue.claim(workerId);
  if (!claimed3) throw new Error("Could not claim job for attempt 3");
  await queue.fail(claimed3.id, "Third attempt failed (final)", 0);

  const finalJob = await queue.getJob(claimed.jobId);
  if (!finalJob) throw new Error("Could not fetch final job status");

  console.log(` - Final Job Status: ${finalJob.status} | Attempts: ${finalJob.attempts}/${finalJob.maxAttempts} | Error: ${finalJob.lastError}`);
  if (finalJob.status !== "failed") {
    throw new Error(`Expected status 'failed', got: ${finalJob.status}`);
  }
  console.log(" ✅ Permanent Failure passed.");

  // Clean up database entries created in test
  (queue as any).db.prepare("DELETE FROM render_jobs WHERE job_id = ?").run(claimed.jobId);

  console.log("\n=================================================");
  console.log("  🎉 ALL RENDER QUEUE SYSTEM UNIT TESTS PASSED   ");
  console.log("=================================================");
}

runQueueTests().catch((err) => {
  console.error("\n❌ Queue Tests Failed:", err);
  process.exit(1);
});
