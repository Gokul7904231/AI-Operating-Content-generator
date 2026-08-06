import { VisualPipeline } from "../lib/visual-assets/VisualPipeline";
import { VisualContext, CandidateAsset } from "../lib/visual-assets/VisualIntelligenceTypes";
import fs from "fs";
import path from "path";

const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;

async function testRecommendationAndCritic() {
  console.log(cyan("================================================================="));
  console.log(cyan("      COMMENCING VISUAL RECOMMENDATION & CRITIC TEST SUITE       "));
  console.log(cyan("================================================================="));

  const pipeline = new VisualPipeline();

  // Create two mock candidate assets:
  // Candidate A: High quality, standard relevance, but NO behavioral history (defaults)
  // Candidate B: Slightly lower raw quality, but EXCELLENT behavioral history (high CTR and retention)
  const cacheDir = path.resolve(process.cwd(), "data", "visual-assets-cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  
  const dummyFile = path.join(cacheDir, "dummy_fuji.webp");
  if (!fs.existsSync(dummyFile)) {
    const sharp = require("sharp");
    await sharp({
      create: { width: 1080, height: 1920, channels: 3, background: { r: 10, g: 30, b: 20 } }
    }).webp().toFile(dummyFile);
  }

  const candA: CandidateAsset = {
    id: "candidate_A_standard",
    storageKey: "",
    path: dummyFile,
    sha256: "dummy_fuji",
    dhash: "dhash_a",
    license: "CC0",
    author: "Photographer A",
    sourceUrl: "https://wikipedia.org",
    attributionRequired: false,
    qualityScore: 8.0, // high raw quality
    width: 1080,
    height: 1920,
    tags: ["japan", "landmarks", "desert"],
    source: "wikimedia",
    usageCount: 0,
    ctr: 0.04, // low CTR
    retentionRate: 0.45, // low retention
  };

  const candB: CandidateAsset = {
    id: "candidate_B_behavioral_champion",
    storageKey: "",
    path: dummyFile,
    sha256: "dummy_fuji",
    dhash: "dhash_b",
    license: "CC0",
    author: "Photographer B",
    sourceUrl: "https://wikipedia.org",
    attributionRequired: false,
    qualityScore: 7.2, // slightly lower raw quality
    width: 1080,
    height: 1920,
    tags: ["japan", "landmarks", "desert"],
    source: "wikimedia",
    usageCount: 0,
    ctr: 0.12, // extremely high CTR (12%)
    retentionRate: 0.78, // extremely high retention (78%)
  };

  const context: VisualContext = {
    jobId: "test_job_recommendation",
    sceneIndex: 2,
    sceneText: "What is the largest desert in the world?",
    topic: "Desert",
    role: "read",
    candidates: [candA, candB],
    history: {
      recentAssets: [],
      recentColors: [],
      recentProviders: [],
      recentLayouts: [],
      recentTopics: [],
      recentTags: [],
      recentDhashes: [],
      recentAuthors: [],
    },
    metrics: {},
    config: {
      providerPriority: ["wikimedia"],
      styleName: "quiz",
      weights: {
        relevance: 0.25,
        quality: 0.15,
        portrait: 0.15,
        license: 0.1,
        diversity: 0.05,
        usage: 0.05,
        behavioral: 0.25, // Give high weight to user-retention and CTR metrics!
      },
    },
  };

  console.log(" - Dispatching VisualPipeline...");
  // Stub database queries by injecting pre-defined candidates directly to test ranking behaviour
  const originalRun = (pipeline as any).providers.run;
  (pipeline as any).providers.run = async (ctx: any) => {
    ctx.candidates = [candA, candB];
  };

  const visualPackage = await pipeline.run(context);
  
  // Restore provider search stub
  (pipeline as any).providers.run = originalRun;

  console.log(green(" ✅ Pipeline finished successfully!"));

  console.log(yellow("\n1. Verifying Design Recommendations (VisualRecommendationEngine):"));
  console.log(`  · Layout Type: "${visualPackage.metadata.recommendation?.layoutType}"`);
  console.log(`  · Textures   : [${visualPackage.metadata.recommendation?.textures.join(", ")}]`);
  console.log(`  · Ambient FX : [${visualPackage.metadata.recommendation?.ambientEffects.join(", ")}]`);
  console.log(`  · Mask ID    : "${visualPackage.metadata.recommendation?.foregroundMask}"`);
  
  if (visualPackage.metadata.recommendation?.layoutType !== "thematic_texture") {
    throw new Error("Failed to resolve correct layout theme recommendation for desert!");
  }

  console.log(yellow("\n2. Verifying Behavioral Ranking Bias (AssetRankingEngine):"));
  console.log(`  · Selected Asset ID: "${context.selectedAsset?.id}"`);
  const rankLogs = visualPackage.metadata.debug.rankLogs;
  console.log(`  · Candidate A (standard) rank: ${rankLogs["candidate_A_standard"]?.rank} | Score: ${rankLogs["candidate_A_standard"]?.score}`);
  console.log(`  · Candidate B (behavioral) rank: ${rankLogs["candidate_B_behavioral_champion"]?.rank} | Score: ${rankLogs["candidate_B_behavioral_champion"]?.score}`);
  
  if (context.selectedAsset?.id !== "candidate_B_behavioral_champion") {
    throw new Error("Behavioral bias failed: Did not select the CTR/retention champion!");
  }
  console.log(green("  · Successfully rewarded CTR/retention champion over higher raw quality."));

  console.log(yellow("\n3. Verifying Critic Evaluation Loop (VisualCritic):"));
  const evaluation = visualPackage.metadata.evaluation;
  console.log(`  · Background Quality Score    : ${evaluation?.backgroundScore}`);
  console.log(`  · Contrast Score              : ${evaluation?.contrastScore}`);
  console.log(`  · Subtitle Visibility Score    : ${evaluation?.subtitleVisibilityScore}`);
  console.log(`  · Safe Area Score             : ${evaluation?.safeAreaScore}`);
  console.log(`  · Variety Score               : ${evaluation?.varietyScore}`);
  console.log(`  · Brand Consistency Score     : ${evaluation?.brandConsistencyScore}`);
  console.log(`  · Overall Score               : ${evaluation?.overallScore}`);

  if (!evaluation || evaluation.overallScore === 0) {
    throw new Error("Critic evaluation failed to return validation scores");
  }

  console.log(yellow("\n4. Pipeline Latency Markers:"));
  console.log(`  · recommendationTime : ${visualPackage.metadata.debug.metrics.recommendationTime} ms`);
  console.log(`  · criticTime         : ${visualPackage.metadata.debug.metrics.criticTime} ms`);

  console.log(cyan("\n================================================================="));
  console.log(cyan("   🎉 ALL VISUAL RECOMMENDATION & CRITIC VERIFICATIONS PASSED   "));
  console.log(cyan("================================================================="));
}

testRecommendationAndCritic().catch((err) => {
  console.error("\n❌ Recommendation/Critic validation failed:", err);
  process.exit(1);
});
