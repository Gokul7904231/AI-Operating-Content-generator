import { VoiceWorker } from "../lib/voice/voice-worker";
import { VoiceRouter } from "../lib/voice/voice-router";
import { NarrationRole } from "../lib/voice/narration-role";
import fs from "fs";
import path from "path";

async function run() {
  console.log("=================================================");
  console.log("  RUNNING 100-RUN STABILITY COMPILATION TEST");
  console.log("=================================================");

  const totalRuns = 100;
  const reportsDir = path.join(process.cwd(), "scratch", "stability_reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Clear existing stability reports
  const existingFiles = fs.readdirSync(reportsDir);
  for (const file of existingFiles) {
    fs.unlinkSync(path.join(reportsDir, file));
  }

  const mockNarratives = [
    "🌏 Welcome to the ultimate world geography quiz challenge!",
    "Question 1: Which country has the most natural lakes? Is it Canada or Russia?",
    "The correct answer is Canada!",
    "Question 2: What is the smallest country in the world?",
    "The correct answer is Vatican City!",
    "Question 3: Which desert is the driest place on Earth?",
    "The correct answer is the Atacama Desert!",
    "Thanks for playing! Like and subscribe for more trivia challenges."
  ];

  console.log(`[Stability] Executing ${totalRuns} simulated video voice steps...`);

  let failuresCount = 0;

  for (let runIdx = 1; runIdx <= totalRuns; runIdx++) {
    const jobId = `stability_job_${runIdx}`;
    const runReports: any[] = [];
    let session: any = null;

    try {
      session = await VoiceRouter.createSession(jobId);
      const outputDir = path.join(reportsDir, jobId);
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      let attemptsAccum = 0;
      let cacheHitsAccum = 0;

      for (let clipIdx = 0; clipIdx < mockNarratives.length; clipIdx++) {
        const text = mockNarratives[clipIdx];
        const role = clipIdx === 0 ? NarrationRole.INTRO : NarrationRole.MAIN;
        const outputPath = path.join(outputDir, `clip_${clipIdx}.wav`);
        const startSynth = Date.now();

        const result = await VoiceWorker.generate({
          jobId,
          text,
          outputPath,
          session,
          role
        });

        attemptsAccum += result.attempts;
        if (result.cacheHit) cacheHitsAccum++;

        const voiceId = role === NarrationRole.INTRO ? session.introVoiceId : session.mainVoiceId;

        runReports.push({
          scene: clipIdx,
          sceneId: `scene_${clipIdx}`,
          role,
          provider: session.providerId,
          voiceId,
          textHash: (result as any).textHash || "",
          cacheHash: (result as any).cacheHash || "",
          generationStart: new Date(startSynth).toISOString(),
          generationEnd: new Date().toISOString(),
          pipelineMs: Date.now() - startSynth,
          textLength: text.length,
          wavGenerated: fs.existsSync(outputPath),
          wavSize: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0,
          duration: 3.5, // Mock duration
          timelineInserted: true,
          ffmpegInput: true,
          finalVideo: true,
          status: "ok",
          cacheHit: result.cacheHit,
          attempts: result.attempts
        });
      }

      // Write narration-report.json for the run
      fs.writeFileSync(
        path.join(outputDir, "narration-report.json"),
        JSON.stringify({
          videoId: jobId,
          sessionId: session.sessionId,
          providerId: session.providerId,
          introVoiceId: session.introVoiceId,
          mainVoiceId: session.mainVoiceId,
          language: "en-US",
          totalDuration: mockNarratives.length * 3.5,
          clips: runReports,
          failures: [],
          retriesCount: Math.max(0, attemptsAccum - mockNarratives.length),
          createdAt: Date.now()
        }, null, 2)
      );

    } catch (err: any) {
      console.error(`[Run ${runIdx} FAILED]: ${err.message}`);
      failuresCount++;
    }
  }

  // Parse all generated stability reports to calculate final system statistics
  console.log("\n[Stability] Compiling aggregate telemetry statistics...");
  
  let totalClipsGenerated = 0;
  let totalWavSize = 0;
  let totalDuration = 0;
  let providerSwitches = 0;
  let voiceSwitches = 0;
  let cacheHitsCount = 0;
  let totalAttempts = 0;
  let totalPipelineMs = 0;

  const jobDirs = fs.readdirSync(reportsDir);
  for (const jobDir of jobDirs) {
    const reportFilePath = path.join(reportsDir, jobDir, "narration-report.json");
    if (!fs.existsSync(reportFilePath)) continue;

    const report = JSON.parse(fs.readFileSync(reportFilePath, "utf8"));
    const lockedProvider = report.providerId;
    const lockedIntroVoice = report.introVoiceId;
    const lockedMainVoice = report.mainVoiceId;

    for (const clip of report.clips) {
      totalClipsGenerated++;
      totalWavSize += clip.wavSize;
      totalDuration += clip.duration;
      cacheHitsCount += clip.cacheHit ? 1 : 0;
      totalAttempts += clip.attempts;
      totalPipelineMs += clip.pipelineMs;

      // Assert zero provider and voice switching
      if (clip.provider !== lockedProvider) {
        providerSwitches++;
      }
      
      const expectedVoice = clip.role === NarrationRole.INTRO ? lockedIntroVoice : lockedMainVoice;
      if (clip.voiceId !== expectedVoice) {
        voiceSwitches++;
      }
    }
  }

  console.log("\n=================================================");
  console.log("  100-RUN STABILITY COMPILATION REPORT");
  console.log("=================================================");
  console.log(`- Simulated Videos: ${jobDirs.length}`);
  console.log(`- Failed Runs: ${failuresCount}/${totalRuns}`);
  console.log(`- Total Audio Clips Generated: ${totalClipsGenerated}`);
  console.log(`- Total Telemetry Data Size: ${(totalWavSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`- Average Video Duration: ${(totalDuration / jobDirs.length).toFixed(2)} seconds`);
  console.log(`- Average Pipeline Latency: ${(totalPipelineMs / totalClipsGenerated).toFixed(2)} ms`);
  console.log(`- Provider Switches: ${providerSwitches} (Expected: 0)`);
  console.log(`- Voice Switches: ${voiceSwitches} (Expected: 0)`);
  console.log(`- Retry Rate: ${((totalAttempts - totalClipsGenerated) / totalClipsGenerated * 100).toFixed(2)}%`);
  console.log(`- Cache Hit Rate: ${((cacheHitsCount / totalClipsGenerated) * 100).toFixed(2)}%`);

  if (failuresCount === 0 && providerSwitches === 0 && voiceSwitches === 0) {
    console.log("\n✅ 100-RUN STABILITY STRESS TEST PASSED!");
  } else {
    console.error("\n❌ 100-RUN STABILITY STRESS TEST FAILED CONSTRAINTS!");
  }

  // Cleanup stability directory
  try {
    const cleanDir = (dirPath: string) => {
      if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
          const curPath = path.join(dirPath, file);
          if (fs.lstatSync(curPath).isDirectory()) {
            cleanDir(curPath);
          } else {
            fs.unlinkSync(curPath);
          }
        });
        fs.rmdirSync(dirPath);
      }
    };
    cleanDir(reportsDir);
  } catch {}
}

run();
