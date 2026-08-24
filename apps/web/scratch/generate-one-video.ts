import fs from "fs";

const BASE_URL = "http://127.0.0.1:3000";

async function run() {
  const topicInfo = { topic: "India Geography Quiz", code: "IN" };
  console.log(`\n=======================================================`);
  console.log(`  GENERATING ONE VIDEO FOR: ${topicInfo.topic.toUpperCase()}`);
  console.log(`=======================================================`);

  const draftRes = await fetch(`${BASE_URL}/api/quiz/mock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      countryCode: topicInfo.code,
      tone: "Challenging & Provocative",
      format: "3_rapid",
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
  const jobId = renderJob.jobId || renderJob.id;
  console.log(`Job queued: ${jobId}`);

  // Poll status
  let isDone = false;
  while (!isDone) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`${BASE_URL}/api/job-status/${jobId}`);
    if (!statusRes.ok) continue;
    const statusData = await statusRes.json();
    console.log(`Job Status: ${statusData.status} (Progress: ${statusData.progress || 0}%)`);
    if (statusData.status === "completed" || statusData.status === "failed") {
      isDone = true;
      if (statusData.status === "completed") {
        console.log(`✅ COMPLETED: ${topicInfo.topic} (Job ID: ${jobId})`);
      } else {
        console.error(`❌ FAILED: ${topicInfo.topic}`);
      }
    }
  }
}

run();
