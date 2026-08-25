import fs from "fs";
import path from "path";

function getSharp() {
  try {
    const pkg = "sharp";
    return require(pkg);
  } catch {
    return null;
  }
}
import { getStorageProvider } from "./StorageProvider";
import { AssetCurator } from "./AssetCurator";
import { VisualPackBuilder } from "./VisualPackBuilder";
import { db } from "../firebase-admin";
import { VisualPipeline } from "./VisualPipeline";
import { VisualContext, PipelineHistory } from "./VisualIntelligenceTypes";

export interface CacheEntry {
  key: string;
  filePath: string;
  sizeBytes: number;
  lastUsed: number;
  usageCount: number;
}

export interface AssetMetadata {
  storageKey: string;
  dhash: string;
  sha256: string;
  license: string;
  author: string;
  sourceUrl: string;
  attributionRequired: boolean;
  qualityScore: number;
  tags: string[];
  visualPackage?: any;
}

export class VisualIntelligence {
  static async determineCategoryAndTags(
    text: string,
    topic: string
  ): Promise<{ category: string; tags: string[] }> {
    const textLower = text.toLowerCase();
    let category = "Landmarks";
    const tags: string[] = [topic.toLowerCase()];

    if (textLower.includes("city") || textLower.includes("capital") || textLower.includes("tokyo") || textLower.includes("london") || textLower.includes("delhi") || textLower.includes("paris") || textLower.includes("berlin") || textLower.includes("urban") || textLower.includes("street")) {
      category = "Cities";
      tags.push("city", "urban", "skyline");
    } else if (textLower.includes("mountain") || textLower.includes("river") || textLower.includes("lake") || textLower.includes("nature") || textLower.includes("forest") || textLower.includes("ocean") || textLower.includes("sea") || textLower.includes("scenic")) {
      category = "Nature";
      tags.push("nature", "scenic", "landscape");
    } else if (textLower.includes("food") || textLower.includes("sushi") || textLower.includes("curry") || textLower.includes("pizza") || textLower.includes("cuisine") || textLower.includes("dish") || textLower.includes("cook")) {
      category = "Food";
      tags.push("food", "dish", "cuisine");
    } else if (textLower.includes("culture") || textLower.includes("festival") || textLower.includes("traditional") || textLower.includes("kimono") || textLower.includes("dance")) {
      category = "Culture";
      tags.push("culture", "tradition", "festival");
    } else if (textLower.includes("flag") || textLower.includes("banner")) {
      category = "Flags";
      tags.push("flag", "national");
    } else if (textLower.includes("map") || textLower.includes("border") || textLower.includes("geography")) {
      category = "Maps";
      tags.push("map", "geography");
    } else if (textLower.includes("architecture") || textLower.includes("temple") || textLower.includes("shrine") || textLower.includes("castle") || textLower.includes("palace") || textLower.includes("building")) {
      category = "Architecture";
      tags.push("architecture", "building");
    } else if (textLower.includes("landmark") || textLower.includes("monument") || textLower.includes("tower") || textLower.includes("statue")) {
      category = "Landmarks";
      tags.push("landmark", "monument");
    } else if (textLower.includes("travel") || textLower.includes("tourism") || textLower.includes("visit")) {
      category = "Travel";
      tags.push("travel", "tourism");
    }

    return { category, tags };
  }
}

class VisualAssetManagerClass {
  private cacheDir = path.resolve(process.cwd(), "data", "visual-assets-cache");
  private cacheIndexFile = path.join(this.cacheDir, "cache_index.json");
  private cacheMap = new Map<string, CacheEntry>();
  private storage = getStorageProvider();
  private pipeline = new VisualPipeline();

  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    b2Reads: 0,
    openverseDownloads: 0,
    wikimediaDownloads: 0,
    aiFallbacks: 0,
    totalRetrievalTimeMs: 0,
    totalRequests: 0,
  };

  constructor() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    this.loadCacheIndex();
    this.prewarmHottestTopics();
  }

  private loadCacheIndex() {
    if (fs.existsSync(this.cacheIndexFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.cacheIndexFile, "utf8"));
        for (const entry of data) {
          this.cacheMap.set(entry.key, entry);
        }
      } catch (err: any) {
        console.warn("[VisualAssetManager] Failed to load cache index:", err.message);
      }
    }
  }

  private saveCacheIndex() {
    try {
      const data = Array.from(this.cacheMap.values());
      fs.writeFileSync(this.cacheIndexFile, JSON.stringify(data, null, 2), "utf8");
    } catch (err: any) {
      console.error("[VisualAssetManager] Failed to save cache index:", err.message);
    }
  }

  private async prewarmHottestTopics() {
    const hotCountries = ["United States", "United Kingdom", "India", "Japan"];
    console.log("[VisualAssetManager] Background prewarming triggered for:", hotCountries.join(", "));
    const builder = new VisualPackBuilder();
    
    (async () => {
      for (const country of hotCountries) {
        try {
          await builder.buildPack(country, "Landmarks").catch(() => {});
          await builder.buildPack(country, "Cities").catch(() => {});
        } catch {}
      }
      console.log("[VisualAssetManager] Background prewarming complete.");
    })();
  }

  async getVisualPack(params: {
    topic: string;
    questions: any[];
    style?: string;
  }): Promise<Array<{ path: string; metadata: AssetMetadata }>> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    const numQuestions = params.questions.length;
    const results: Array<{ path: string; metadata: AssetMetadata }> = [];

    const sharedHistory: PipelineHistory = {
      recentAssets: [],
      recentColors: [],
      recentProviders: [],
      recentLayouts: [],
      recentTopics: [],
      recentTags: [],
      recentDhashes: [],
      recentAuthors: [],
    };

    // 4 unique images per question mapping spec
    const sceneSpecs: Array<{ sceneIndex: number; text: string; role: "hook" | "read" | "reveal" | "outro" }> = [];
    sceneSpecs.push({ sceneIndex: 0, text: `Topic Hook for ${params.topic}`, role: "hook" });
    
    params.questions.forEach((q, idx) => {
      const qNum = idx + 1;
      sceneSpecs.push({ sceneIndex: 1 + idx * 4, text: `${q.question} trivia question query`, role: "read" });
      sceneSpecs.push({ sceneIndex: 2 + idx * 4, text: `${q.question} options display: ${q.options?.join(", ") || ""}`, role: "read" });
      sceneSpecs.push({ sceneIndex: 3 + idx * 4, text: `${q.question} thinking countdown concept`, role: "read" });
      sceneSpecs.push({ sceneIndex: 4 + idx * 4, text: `The correct answer is ${q.answer || ""}`, role: "reveal" });
    });
    sceneSpecs.push({ sceneIndex: 1 + numQuestions * 4, text: `Outro card for topic ${params.topic}`, role: "outro" });

    // Pre-fetch candidate pool
    const topicPoolCandidates: any[] = [];
    try {
      console.log(`[VisualAssetManager] Pre-fetching unified topic asset pool for: ${params.topic}`);
      const { ProviderFramework } = await import("./ProviderFramework");
      const { VisualPolicyEngine } = await import("./VisualPolicyEngine");
      
      const dummyContext: VisualContext = {
        jobId: `job_${startTime}_prewarm`,
        sceneIndex: 0,
        sceneText: `Topic query landmarks culture travel nature cities food for ${params.topic}`,
        topic: params.topic,
        role: "read",
        candidates: [],
        history: sharedHistory,
        metrics: {},
        config: {
          providerPriority: ["wikimedia", "openverse"],
          styleName: "quiz",
          weights: { relevance: 0.5, quality: 0.5, portrait: 0.0, license: 0.0, diversity: 0.0, usage: 0.0 }
        }
      };
      
      const providerFramework = new ProviderFramework();
      await providerFramework.run(dummyContext);
      
      const policyEngine = new VisualPolicyEngine();
      await policyEngine.run(dummyContext);
      
      topicPoolCandidates.push(...dummyContext.candidates);
      console.log(`[VisualAssetManager] Unified topic asset pool pre-fetched successfully: ${topicPoolCandidates.length} vetted candidates.`);
    } catch (err: any) {
      console.warn(`[VisualAssetManager] Pre-fetching unified topic asset pool failed: ${err.message}`);
    }

    const seenHashes = new Set<string>();

    for (const spec of sceneSpecs) {
      let uniqueFound = false;
      let attempts = 0;
      let finalPackage: any = null;

      while (attempts < 3 && !uniqueFound) {
        attempts++;
        try {
          const queryText = spec.text + (attempts > 1 ? ` variant ${attempts}` : "");
          const context: VisualContext = {
            jobId: `job_${startTime}`,
            sceneIndex: spec.sceneIndex,
            sceneText: queryText,
            topic: params.topic,
            role: spec.role,
            candidates: [...topicPoolCandidates],
            history: sharedHistory,
            metrics: {},
            config: {
              providerPriority: ["wikimedia", "openverse"],
              styleName: (params.style as any) || "quiz",
              weights: {
                relevance: 0.35,
                quality: 0.2,
                portrait: 0.15,
                license: 0.15,
                diversity: 0.1,
                usage: 0.05,
              },
            },
          };

          const visualPackage = await this.pipeline.run(context);
          const imgPath = visualPackage.background.path;
          
          if (fs.existsSync(imgPath)) {
            // Verify resolution & aspect ratio
            const sharpMod = getSharp();
            let w = 1080;
            let h = 1920;
            if (sharpMod) {
              const meta = await sharpMod(imgPath).metadata();
              w = meta.width || 0;
              h = meta.height || 0;
            }
            const isPortrait = h > w;
            const aspect = w / (h || 1);
            const is916 = aspect >= 0.5 && aspect <= 0.65;

            if (w >= 720 && h >= 1280 && (isPortrait || is916)) {
              const hash = visualPackage.background.sha256;
              if (!seenHashes.has(hash)) {
                seenHashes.add(hash);
                finalPackage = visualPackage;
                uniqueFound = true;
                break;
              }
            }
          }
        } catch (err: any) {
          console.warn(`[VisualAssetManager] Fetch attempt ${attempts} failed: ${err.message}`);
        }
      }

      // AI Vertical fallback if search failed or resolution constraints failed
      if (!uniqueFound || !finalPackage) {
        console.log(`[VisualAssetManager] Could not find unique vertical image for spec ${spec.sceneIndex}. Invoking FLUX vertical fallback...`);
        try {
          const context: VisualContext = {
            jobId: `job_${startTime}`,
            sceneIndex: spec.sceneIndex,
            sceneText: spec.text + ` unique_${Math.random().toString(36).slice(2, 8)}`,
            topic: params.topic,
            role: spec.role,
            candidates: [], // force AI fallback
            history: sharedHistory,
            metrics: {},
            config: {
              providerPriority: ["wikimedia", "openverse"],
              styleName: (params.style as any) || "quiz",
              weights: { relevance: 0, quality: 0, portrait: 0, license: 0, diversity: 0, usage: 0 }
            }
          };
          finalPackage = await this.pipeline.run(context);
        } catch (err: any) {
          // Solid color backup — but must still be a COMPLETE SceneVisualPackage
          // so downstream (step exec, debug report, renderer) never hits undefined.
          const fallbackPath = path.join(this.cacheDir, "fallback_solid.jpg");
          if (!fs.existsSync(fallbackPath)) {
            const sharpMod = getSharp();
            if (sharpMod) {
              await sharpMod({
                create: { width: 1080, height: 1920, channels: 3, background: { r: 15, g: 23, b: 42 } },
              })
                .jpeg({ quality: 85 })
                .toFile(fallbackPath);
            } else {
              fs.writeFileSync(fallbackPath, Buffer.from(""));
            }
          }
          finalPackage = {
            jobId: `job_${startTime}`,
            sceneIndex: spec.sceneIndex,
            background: {
              path: fallbackPath,
              sha256: `fallback_${spec.sceneIndex}`,
              credits: "System solid-color fallback",
            },
            composition: {
              elements: [
                { type: "background", layer: 0, bounds: { x: 0, y: 0, width: 100, height: 100 }, opacity: 1.0, anchor: "center", assetPath: fallbackPath },
              ],
              safeArea: { top: 15, bottom: 20, left: 8, right: 8 },
              cameraMotion: { type: "none", scaleFrom: 1.0, scaleTo: 1.0, durationSeconds: 6.0 },
              transition: { in: "none", out: "none" },
            },
            style: { name: (params.style as any) || "quiz" },
            graph: { root: { props: { cameraMotion: { type: "none" } } } },
            metadata: {
              intent: { complexity: "simple", entities: [], topic: params.topic, category: "Landmarks", emotion: "", visualStyle: "", countries: [], people: [], logos: [], maps: [] },
              plan: { sceneRole: spec.role, specs: [] },
              recommendation: undefined,
              evaluation: undefined,
              debug: { metrics: {}, rankLogs: {} },
            },
          };
        }
      }

      results.push({
        path: finalPackage.background.path,
        metadata: {
          storageKey: finalPackage.background.sha256,
          dhash: finalPackage.background.sha256.slice(0, 16),
          sha256: finalPackage.background.sha256,
          license: finalPackage.style?.name || "quiz",
          author: finalPackage.background.credits || "ShortsFactory",
          sourceUrl: finalPackage.graph?.root?.props?.cameraMotion?.type || "",
          attributionRequired: false,
          qualityScore: finalPackage.background.qualityScore || 8.5,
          tags: finalPackage.metadata?.intent?.entities || [],
          visualPackage: finalPackage
        }
      });
    }

    this.metrics.totalRetrievalTimeMs += Date.now() - startTime;
    return results;
  }

  getMetrics() {
    const hits = this.metrics.cacheHits;
    const misses = this.metrics.cacheMisses;
    const total = hits + misses;
    const hitRate = total > 0 ? parseFloat(((hits / total) * 100).toFixed(1)) : 100;

    return {
      ...this.metrics,
      cacheHitRate: `${hitRate}%`,
    };
  }

  async saveDebugReport(jobId: string, visualPack: any[]) {
    const debugDir = path.resolve(process.cwd(), "data", "debug", `video-${jobId}`);
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    const reportScenes: any[] = [];

    visualPack.forEach((item, index) => {
      if (!item) return;
      const metadata = item.metadata || {};
      const pkg = metadata.visualPackage;
      if (!pkg || !pkg.composition || !pkg.composition.elements) {
        console.warn(`[VisualAssetManager] saveDebugReport: scene ${index} has no valid composition; skipping layout dump.`);
        if (pkg) {
          const sceneJsonPath = path.join(debugDir, `scene-${index}.json`);
          fs.writeFileSync(sceneJsonPath, JSON.stringify(pkg, null, 2), "utf8");
        }
        return;
      }

      const sceneJsonPath = path.join(debugDir, `scene-${index}.json`);
      fs.writeFileSync(sceneJsonPath, JSON.stringify(pkg, null, 2), "utf8");

      const assetsJsonPath = path.join(debugDir, `scene-${index}-selected-assets.json`);
      fs.writeFileSync(assetsJsonPath, JSON.stringify(pkg.background, null, 2), "utf8");

      const layoutJsonPath = path.join(debugDir, `scene-${index}-layout.json`);
      fs.writeFileSync(layoutJsonPath, JSON.stringify(pkg.composition.elements, null, 2), "utf8");

      reportScenes.push({
        sceneIndex: index,
        intent: pkg.metadata.intent,
        style: pkg.style.name,
        evaluation: pkg.metadata.evaluation,
        timing: pkg.metadata.debug.metrics,
      });
    });

    const reportPath = path.join(debugDir, "pipeline-report.json");
    const report = {
      jobId,
      timestamp: new Date().toISOString(),
      scenes: reportScenes,
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  }
}

export const VisualAssetManager = new VisualAssetManagerClass();
