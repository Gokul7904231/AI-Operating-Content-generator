import path from "path";
import fs from "fs";

const BASE_URL = "http://127.0.0.1:3000";

async function run() {
  console.log("=======================================================");
  console.log("  GENERATING SHORTSFACTORY VIDEO FOR INDIA             ");
  console.log("=======================================================");

  // 1. Check dev server health
  console.log(`Checking dev server health on ${BASE_URL} ...`);
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err: any) {
    console.error(`❌ Local dev server at ${BASE_URL} is not reachable. Please start it using 'npm run dev' first.`);
    process.exit(1);
  }
  console.log("✅ Dev server is healthy.");

  // 2. Fetch quiz draft for India
  console.log("\nRequesting quiz draft for India (IN)...");
  const draftRes = await fetch(`${BASE_URL}/api/quiz/mock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      countryCode: "IN",
      tone: "Challenging & Provocative",
      format: "6_rapid",
      version: 1,
    }),
  });

  if (!draftRes.ok) {
    console.error(`❌ Failed: /api/quiz/mock returned HTTP ${draftRes.status}`);
    process.exit(1);
  }

  const draft = await draftRes.json();
  console.log(`✅ India Quiz Draft generated.`);
  console.log(`Hook: "${draft.hook}"`);
  console.log(`Questions: ${draft.questions?.length}`);

  // 3. Trigger video generation
  console.log("\nTriggering India video generation pipeline...");
  const payload = {
    topic: "India Geo Quiz",
    style: "quiz",
    contentType: "QUIZ_SHORTS",
    hook: draft.hook,
    questions: draft.questions,
    title: `India Geo Quiz`,
    description: draft.gradingScale,
    hashtags: ["quiz", "india", "geoquiz", "shorts"],
    renderProfile: "AUTO",
    durationSeconds: 60,
  };

  const renderRes = await fetch(`${BASE_URL}/api/generate-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!renderRes.ok) {
    console.error(`❌ Failed: /api/generate-video returned HTTP ${renderRes.status}`);
    process.exit(1);
  }

  const renderJob = await renderRes.json();
  const jobId = renderJob.jobId;
  console.log(`✅ Generation job successfully queued. Job ID: ${jobId}`);

  // 4. Poll job status
  console.log("\nPolling status until India compilation completes...");
  let status = "queued";
  let elapsed = 0;
  const maxWait = 480; // 8 minutes timeout

  while (elapsed < maxWait) {
    let statusData: any = null;
    try {
      const statusRes = await fetch(`${BASE_URL}/api/job-status/${jobId}`);
      if (statusRes.ok) {
        statusData = await statusRes.json();
        status = statusData.status;
      }
    } catch {}

    console.log(`[T+${elapsed}s] Job Status: ${status}`);

    if (status === "completed") {
      console.log("\n=======================================================");
      console.log("  🎉 INDIA SHORTS COMPILATION COMPLETED SUCCESSFULLY!  ");
      console.log("=======================================================");
      console.log(`Output Video Path: ${statusData.videoPath || "Check temp directory"}`);
      process.exit(0);
    }

    if (status === "failed") {
      console.error(`\n❌ Video compilation failed for job ID: ${jobId}`);
      process.exit(1);
    }

    await new Promise((r) => setTimeout(r, 4000));
    elapsed += 4;
  }

  console.error("\n❌ Timeout reached waiting for India video compilation.");
  process.exit(1);
}

run().catch((err) => {
  console.error("Error running India generator:", err);
  process.exit(1);
});
