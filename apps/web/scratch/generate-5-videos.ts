import fs from "fs";

const BASE_URL = "http://127.0.0.1:3000";

const TOPICS = [
  { topic: "India Geography Quiz", code: "IN" },
  { topic: "Japan Culture Quiz", code: "JP" },
  { topic: "France History Quiz", code: "FR" },
  { topic: "Coding Quiz", code: "US" },
  { topic: "Guess The Flag Quiz", code: "US" }
];

async function compileVideo(topicInfo: { topic: string; code: string }) {
  console.log(`\n=======================================================`);
  console.log(`  GENERATING VIDEO FOR: ${topicInfo.topic.toUpperCase()}`);
  console.log(`=======================================================`);

  const draftRes = await fetch(`${BASE_URL}/api/quiz/mock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      countryCode: topicInfo.code,
      tone: "Challenging & Provocative",
      format: "3_rapid", // fast 3-question format for quick batch verification
      version: 1,
    }),
  });

  if (!draftRes.ok) {
    throw new Error(`Draft endpoint returned HTTP ${draftRes.status}`);
  }

  const draft = await draftRes.json();
  console.log(`Hook: "${draft.hook}"`);
  console.log(`Questions count: ${draft.questions?.length}`);

  const payload = {
    topic: topicInfo.topic,
    style: "quiz",
    contentType: "QUIZ_SHORTS",
    hook: draft.hook,
    questions: draft.questions,
    title: topicInfo.topic,
    description: draft.gradingScale,
    hashtags: ["quiz", "shorts"],
    renderProfile: "AUTO",
    durationSeconds: 45,
  };

  const renderRes = await fetch(`${BASE_URL}/api/generate-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!renderRes.ok) {
    throw new Error(`Generate-video returned HTTP ${renderRes.status}`);
  }

  const renderJob = await renderRes.json();
  const jobId = renderJob.jobId;
  console.log(`Job queued: ${jobId}`);

  let status = "queued";
  let elapsed = 0;
  while (elapsed < 600) {
    try {
      const statusRes = await fetch(`${BASE_URL}/api/job-status/${jobId}`);
      if (statusRes.ok) {
        const data = await statusRes.json();
        status = data.status;
      }
    } catch {}

    if (status === "completed") {
      console.log(`✅ COMPLETED: ${topicInfo.topic} (Job ID: ${jobId})`);
      return jobId;
    }

    if (status === "failed") {
      throw new Error(`Compilation failed for job ${jobId}`);
    }

    await new Promise((r) => setTimeout(r, 4000));
    elapsed += 4;
  }

  throw new Error(`Timeout waiting for job ${jobId}`);
}

async function run() {
  console.log("Starting 5-video compilation batch validation...");
  const results = [];

  for (const t of TOPICS) {
    const jobId = await compileVideo(t);
    results.push({ topic: t.topic, jobId });
  }

  console.log("\n=======================================================");
  console.log(" 🎉 ALL 5 QUIZ VIDEOS GENERATED AND VALIDATED FRESH!  ");
  console.log("=======================================================");
  results.forEach((r) => console.log(`- ${r.topic}: job ID -> ${r.jobId}`));
}

run().catch((err) => {
  console.error("Batch error:", err);
  process.exit(1);
});
