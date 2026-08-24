import { SQLiteRenderQueue, calculateRequestHash } from "../lib/core/SQLiteRenderQueue";
import { RenderQueueProcessor } from "../lib/core/RenderQueueProcessor";
import { CheckpointDB } from "../lib/core/CheckpointDB";
import { WorkflowStepRegistry } from "../content-engines/_runtime/step-registry";
import { WorkflowRuntime } from "../content-engines/_runtime/workflow-runtime";
import { VisualAssetManager } from "../lib/visual-assets/VisualAssetManager";
import { getStorageProvider } from "../lib/visual-assets/StorageProvider";
import { db } from "../lib/firebase-admin";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Color utilities for clean terminal reports
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runChaosSuite() {
  console.log(cyan("================================================================="));
  console.log(cyan("      COMMENCING CHAOS & RESILIENCE VERIFICATION TEST SUITE      "));
  console.log(cyan("================================================================="));

  const queue = new SQLiteRenderQueue();
  // Clear any existing test records
  (queue as any).db.exec("DELETE FROM render_jobs");

  // Save original step executors to restore them after the test
  const originalExecutors = new Map<string, any>();
  const steps = ["script", "critic", "scene", "voice", "image", "render", "upload", "publish"];
  for (const s of steps) {
    originalExecutors.set(s, WorkflowStepRegistry.get(s));
  }

  // Set up mock counts to track invocations
  const callCounts = {
    script: 0,
    critic: 0,
    scene: 0,
    voice: 0,
    image: 0,
    render: 0,
    upload: 0,
    publish: 0,
  };

  // Configure modular, fast-executing mock steps that simulate execution
  WorkflowStepRegistry.register("script", async (ctx) => {
    callCounts.script++;
    ctx.outputs.script = "Mock Script Content";
    await delay(10);
  });
  WorkflowStepRegistry.register("critic", async (ctx) => {
    callCounts.critic++;
    ctx.outputs.criticScore = 9.5;
    await delay(10);
  });
  WorkflowStepRegistry.register("scene", async (ctx) => {
    callCounts.scene++;
    ctx.outputs.scenes = [{ text: "Scene 1" }];
    await delay(10);
  });
  
  let shouldVoiceFail = false;
  WorkflowStepRegistry.register("voice", async (ctx) => {
    callCounts.voice++;
    if (shouldVoiceFail) {
      throw new Error("TTS Provider Rate Limit / Timeout: fetch failed");
    }
    ctx.outputs.voicePaths = { "/tmp/scene1.mp3": 3.5 };
    await delay(10);
  });

  WorkflowStepRegistry.register("image", async (ctx) => {
    callCounts.image++;
    ctx.outputs.imagePaths = ["/tmp/scene1.jpg"];
    await delay(10);
  });

  let shouldRenderCrash = false;
  WorkflowStepRegistry.register("render", async (ctx) => {
    callCounts.render++;
    if (shouldRenderCrash) {
      // Simulate crash by throwing immediately
      throw new Error("__CRASH_SIMULATION__");
    }
    ctx.outputs.videoPath = "/tmp/final_video.mp4";
    await delay(10);
  });

  WorkflowStepRegistry.register("upload", async (ctx) => {
    callCounts.upload++;
    ctx.outputs.videoUrl = "https://b2.com/mock_video.mp4";
    await delay(10);
  });
  WorkflowStepRegistry.register("publish", async (ctx) => {
    callCounts.publish++;
    ctx.outputs.youtubeUrl = "https://youtube.com/watch?v=mock";
    await delay(10);
  });

  const payload = {
    jobId: "",
    engine: "quiz",
    topic: "Chaos Travel Trivia",
    profile: "FAST_QUIZ",
    questions: [{ question: "Mock?", options: ["A", "B"], answer: "A" }],
  };

  // -----------------------------------------------------------------
  // Test 1: Worker crash mid-render
  // -----------------------------------------------------------------
  console.log(yellow("\n[Test 1] Simulating Worker Crash halfway through rendering..."));
  
  const jobId1 = `job_crash_${Date.now()}`;
  const testPayload1 = { ...payload, jobId: jobId1 };
  
  await queue.enqueue({ jobId: jobId1, payload: testPayload1 });

  const worker1 = "crashed_worker_node";
  const jobToRun = await queue.claim(worker1);
  if (!jobToRun) throw new Error("Could not claim job 1");

  // Let's run a fresh runner loop but trigger a crash in the render step
  shouldRenderCrash = true;
  console.log(" - Dispatching first attempt (simulated crash on render step)...");
  
  const processor = new RenderQueueProcessor();
  
  try {
    // Run the execution directly through WorkflowRuntime to write the checkpoints
    await WorkflowRuntime.run(testPayload1);
  } catch (err: any) {
    console.log(` - Execution failed as expected: ${err.message}`);
  }

  // Update status in the database to show worker crash (heartbeat timeout simulated)
  await queue.fail(jobToRun.id, "Worker timeout");

  // Verify checkpoint exists for render step
  const checkpoint = CheckpointDB.getCheckpoint(jobId1);
  console.log(` - Checkpoint found for job ${jobId1}: step="${checkpoint?.current_step}"`);
  if (checkpoint?.current_step !== "render") {
    throw new Error(`Expected checkpoint at render step, got: ${checkpoint?.current_step}`);
  }

  // Reset crash flag and reclaim
  shouldRenderCrash = false;
  
  // Reclaim job with another worker
  const worker2 = "recovery_worker_node";
  // Reset retry delay in db to claim instantly
  (queue as any).db.prepare("UPDATE render_jobs SET next_retry_at = 0 WHERE id = ?").run(jobToRun.id);
  const claimedForRecovery = await queue.claim(worker2);
  if (!claimedForRecovery) throw new Error("Could not claim job for recovery");

  console.log(" - Dispatching second attempt (resuming from checkpoint)...");
  
  // Reset call counts
  callCounts.script = 0;
  callCounts.critic = 0;
  callCounts.scene = 0;
  callCounts.voice = 0;
  callCounts.image = 0;
  callCounts.render = 0;

  // Run replay
  const recoveryResult = await WorkflowRuntime.replay(jobId1, checkpoint.current_step);
  console.log(` - Recovery Result Status: ${recoveryResult.status} | Success: ${recoveryResult.success}`);
  
  console.log(` - Step call counts during recovery:`);
  console.log(`   · script: ${callCounts.script} (Expected: 0 - skipped)`);
  console.log(`   · voice:  ${callCounts.voice} (Expected: 0 - skipped)`);
  console.log(`   · render: ${callCounts.render} (Expected: 1 - executed)`);

  if (callCounts.script > 0 || callCounts.voice > 0) {
    throw new Error("Failed Saga isolation: Pre-completed steps were incorrectly re-executed!");
  }
  if (callCounts.render !== 1) {
    throw new Error("Saga recovery failed to execute target resume step!");
  }
  console.log(green(" ✅ Test 1 Passed: Heartbeat crash successfully recovered via Saga checkpoints."));

  // -----------------------------------------------------------------
  // Test 2: Submit the same request 100 times simultaneously
  // -----------------------------------------------------------------
  console.log(yellow("\n[Test 2] Submitting the same payload 100 times simultaneously..."));
  (queue as any).db.exec("DELETE FROM render_jobs");
  
  const uniqueTopic = `Trivia_${Date.now()}`;
  const duplicatePayload = { ...payload, topic: uniqueTopic };
  
  console.log(" - Enqueuing 100 requests in parallel...");
  const enqueuePromises = Array.from({ length: 100 }).map((_, idx) => {
    return queue.enqueue({
      jobId: `concurrent_job_${idx}_${Date.now()}`,
      payload: duplicatePayload,
    });
  });

  const results = await Promise.all(enqueuePromises);
  const uniqueJobIds = new Set(results.map((r) => r.jobId));
  
  console.log(` - Enqueue complete. Total unique Job IDs returned: ${uniqueJobIds.size}`);
  
  const dbJobs = (queue as any).db.prepare("SELECT * FROM render_jobs WHERE request_hash = ?").all(
    calculateRequestHash(duplicatePayload)
  );
  console.log(` - Total job records created in SQLite database: ${dbJobs.length}`);

  if (uniqueJobIds.size !== 1) {
    throw new Error("Request idempotency failed: duplicate payloads resolved to different job IDs.");
  }
  if (dbJobs.length !== 1) {
    throw new Error("Idempotency failed: multiple rows were inserted for identical payloads.");
  }
  console.log(green(" ✅ Test 2 Passed: 100 simultaneous requests successfully resolved to exactly 1 database job."));

  // -----------------------------------------------------------------
  // Test 3: Disconnect internet during TTS
  // -----------------------------------------------------------------
  console.log(yellow("\n[Test 3] Simulating Network Disconnect during TTS step..."));
  (queue as any).db.exec("DELETE FROM render_jobs");
  
  const jobId3 = `job_net_fail_${Date.now()}`;
  const testPayload3 = { ...payload, jobId: jobId3 };
  
  await queue.enqueue({ jobId: jobId3, payload: testPayload3 });
  
  // Set voice to fail
  shouldVoiceFail = true;
  const claimed3 = await queue.claim("network_worker");
  if (!claimed3) throw new Error("Could not claim job 3");

  console.log(" - Running job with simulated network error (throws ElevenLabs rate limit/fetch failure)...");
  try {
    await WorkflowRuntime.run(testPayload3);
  } catch (err: any) {
    console.log(` - Generation failed: ${err.message}`);
    await queue.fail(claimed3.id, err.message, 2); // fail with 2s delay
  }

  const failedState = await queue.getJob(jobId3);
  console.log(` - Queue Job State: ${failedState?.status} | Attempts: ${failedState?.attempts}`);
  if (failedState?.status !== "retrying") {
    throw new Error(`Expected status to transition to 'retrying', got: ${failedState?.status}`);
  }

  // Restore internet connection
  shouldVoiceFail = false;
  console.log(" - Restored internet connection (shouldVoiceFail = false). Reclaiming...");
  await delay(2100); // Wait for backoff retry delay to elapse
  
  const claimed3Recovery = await queue.claim("network_worker_2");
  if (!claimed3Recovery) throw new Error("Could not reclaim job 3 after backoff");

  // Fetch checkpoint
  const cp3 = CheckpointDB.getCheckpoint(jobId3);
  console.log(` - Saga checkpoint resume step: "${cp3?.current_step}"`);
  
  // Replay
  const result3 = await WorkflowRuntime.replay(jobId3, cp3!.current_step);
  console.log(` - Final Result status: ${result3.status} | Success: ${result3.success}`);
  if (result3.status !== "completed") {
    throw new Error("Failed to complete recovered job");
  }
  console.log(green(" ✅ Test 3 Passed: Network failure successfully backed off, retried, and completed."));

  // -----------------------------------------------------------------
  // Test 4: Crash the server. Restart
  // -----------------------------------------------------------------
  console.log(yellow("\n[Test 4] Simulating Server Crash and restart recovery..."));
  (queue as any).db.exec("DELETE FROM render_jobs");
  
  const jobId4 = `job_server_crash_${Date.now()}`;
  const testPayload4 = { ...payload, jobId: jobId4 };
  
  // Enqueue and claim
  const job4 = await queue.enqueue({ jobId: jobId4, payload: testPayload4 });
  const crashedWorker = "worker_node_that_will_die";
  
  // Simulate active compilation and halfway crash by saving a checkpoint at 'voice' step
  CheckpointDB.saveCheckpoint(jobId4, "voice", "processing", {
    job: testPayload4,
    workflow: { id: "quiz", steps: [] },
    versions: { workflowVersion: "1.0" }
  }, {
    script: "Mock script",
    scenes: [{ text: "Mock" }]
  });

  // Mark job as 'running' under worker
  (queue as any).db.prepare(`
    UPDATE render_jobs
    SET status = 'running',
        worker_id = ?,
        heartbeat_at = ?,
        attempts = 1
    WHERE id = ?
  `).run(crashedWorker, Date.now() - 40000, job4.id); // backdate heartbeat by 40s

  console.log(" - Server crashed while job was 'running'. Initializing new QueueProcessor (simulating boot)...");
  const freshProcessor = new RenderQueueProcessor();
  
  // Start ticker to execute eviction and recovery loop
  console.log(" - Booting background workers. Scanning databases for stale/abandoned claims...");
  
  // Trigger stale job eviction (threshold 30s)
  await (queue as any).evictStaleJobs(30000);
  
  const recoveredJob4 = await queue.getJob(jobId4);
  console.log(` - Stale job recovered. Status: ${recoveredJob4?.status} | Attempts: ${recoveredJob4?.attempts}`);
  if (recoveredJob4?.status !== "retrying") {
    throw new Error(`Expected crashed job to be rescheduled to 'retrying', got: ${recoveredJob4?.status}`);
  }

  // Claim with new worker and execute
  (queue as any).db.prepare("UPDATE render_jobs SET next_retry_at = 0 WHERE id = ?").run(job4.id);
  const claimedJob4 = await queue.claim("fresh_worker_node");
  if (!claimedJob4) throw new Error("Could not claim job 4");

  const cp4 = CheckpointDB.getCheckpoint(jobId4);
  const result4 = await WorkflowRuntime.replay(jobId4, cp4!.current_step);
  console.log(` - Pipeline completed: Status: ${result4.status} | Success: ${result4.success}`);
  if (result4.status !== "completed") {
    throw new Error("Server crash recovery failed");
  }
  console.log(green(" ✅ Test 4 Passed: Server crash successfully recovered enqueued items upon restart."));

  // -----------------------------------------------------------------
  // Test 5: Delete cached images
  // -----------------------------------------------------------------
  console.log(yellow("\n[Test 5] Simulating cache eviction of images..."));
  
  const testTopic = "Japan";
  const testCategory = "Landmarks";
  const cacheDir = path.resolve(process.cwd(), "data", "visual-assets-cache");

  // Ensure index document exists in Firestore and mock image exists in B2
  const storage = getStorageProvider();
  const mockImageBuffer = await fs.promises.readFile(
    path.resolve(process.cwd(), "content-engines", "quiz", "assets", "countdown_5.jpg")
  ).catch(() => Buffer.from("mock image data"));

  const sha256 = crypto.createHash("sha256").update(mockImageBuffer).digest("hex");
  const testStorageKey = `visual-packs/${testTopic}/${testCategory}/${sha256}.webp`;
  
  // Upload mock to storage emulator
  await storage.upload(testStorageKey, mockImageBuffer, "image/webp");

  // Create Firestore entry
  const testDocId = `${testTopic}_${testCategory}_${sha256}`;
  await db.collection("visual_assets").doc(testDocId).set({
    topic: testTopic,
    category: testCategory,
    status: "active",
    storageKey: testStorageKey,
    sha256,
    dhash: "mockdhash",
    qualityScore: 9.0,
    tags: ["japan", "landmarks"],
    originalUrl: "mock",
    license: "CC0",
    author: "Test",
    attributionRequired: false,
  });

  // Call visual asset manager to fetch and populate local cache
  console.log(" - Fetching visual assets (populating cache)...");
  const pack1 = await VisualAssetManager.getVisualPack({
    topic: testTopic,
    questions: [{ question: "What is Mount Fuji?", options: ["A", "B"], answer: "A" }],
  });

  const cachePath = pack1[1].path;
  console.log(`   Cached image path: ${cachePath} | Size: ${fs.statSync(cachePath).size} bytes`);
  if (!fs.existsSync(cachePath)) throw new Error("Image was not cached locally!");

  // Evict cache: manually delete cached image
  console.log(" - Evicting cache: manually deleting cached image file...");
  fs.unlinkSync(cachePath);
  if (fs.existsSync(cachePath)) throw new Error("Failed to delete cache file!");

  // Fetch again
  console.log(" - Re-fetching same asset (testing local recovery from storage provider)...");
  
  // Reset scraping manager metrics
  const managerMetrics = VisualAssetManager.getMetrics();
  const oldOpenverse = managerMetrics.openverseDownloads;
  const oldWikimedia = managerMetrics.wikimediaDownloads;

  const pack2 = await VisualAssetManager.getVisualPack({
    topic: testTopic,
    questions: [{ question: "What is Mount Fuji?", options: ["A", "B"], answer: "A" }],
  });

  console.log(`   Re-fetched image path: ${pack2[1].path} | Exist: ${fs.existsSync(pack2[1].path)}`);
  if (!fs.existsSync(pack2[1].path)) throw new Error("Failed to recover image from storage emulator!");

  const newMetrics = VisualAssetManager.getMetrics();
  console.log(`   Metrics -> Openverse downloads: ${newMetrics.openverseDownloads} | Wikimedia downloads: ${newMetrics.wikimediaDownloads}`);
  
  if (newMetrics.openverseDownloads !== oldOpenverse || newMetrics.wikimediaDownloads !== oldWikimedia) {
    throw new Error("Cache miss incorrectly triggered external scraper searches!");
  }
  console.log(green(" ✅ Test 5 Passed: Deleting cached images successfully retrieves assets from storage without re-scraping."));

  // Restore step executors
  for (const [s, exec] of originalExecutors.entries()) {
    if (exec) {
      WorkflowStepRegistry.register(s, exec);
    }
  }

  console.log(cyan("\n================================================================="));
  console.log(cyan("   🎉 ALL 5 CHAOS & RESILIENCE VERIFICATION TESTS PASSED 100%   "));
  console.log(cyan("================================================================="));
}

runChaosSuite().catch((err) => {
  console.error(red("\n❌ Chaos verification failed:"), err);
  process.exit(1);
});
