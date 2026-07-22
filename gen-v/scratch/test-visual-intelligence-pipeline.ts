import { VisualAssetManager } from "../lib/visual-assets/VisualAssetManager";
import { VisualPipeline } from "../lib/visual-assets/VisualPipeline";
import { VisualContext } from "../lib/visual-assets/VisualIntelligenceTypes";

const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;

async function testVisualPipeline() {
  console.log(cyan("================================================================="));
  console.log(cyan("        COMMENCING VISUAL INTELLIGENCE PIPELINE TEST SUITE       "));
  console.log(cyan("================================================================="));

  const pipeline = new VisualPipeline();
  
  const context: VisualContext = {
    jobId: "test_job_pipeline",
    sceneIndex: 1,
    sceneText: "What famous monument is located in Paris, France, built by Gustave Eiffel?",
    topic: "France",
    role: "read",
    candidates: [],
    history: {
      recentAssets: [],
      recentColors: [],
      recentProviders: [],
      recentLayouts: [],
      recentTopics: [],
    },
    metrics: {},
    config: {
      providerPriority: ["wikimedia", "openverse"],
      styleName: "travel",
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

  console.log(" - Running VisualPipeline...");
  const visualPackage = await pipeline.run(context);

  console.log(green(" ✅ Pipeline completed successfully!"));
  
  // Assertions
  console.log(yellow("\n1. Verifying Context Pass Outputs:"));
  
  console.log(`  · SceneIntent topic: "${visualPackage.metadata.intent.topic}"`);
  console.log(`  · SceneIntent category: "${visualPackage.metadata.intent.category}"`);
  console.log(`  · SceneIntent entities: [${visualPackage.metadata.intent.entities.join(", ")}]`);
  if (!visualPackage.metadata.intent.topic) throw new Error("SceneIntent topic is missing");

  console.log(`  · AssetPlan specs: ${visualPackage.metadata.plan.specs.length} layers planned.`);
  if (visualPackage.metadata.plan.specs.length === 0) throw new Error("AssetPlan spec list is empty");

  console.log(`  · Selected Background Image: ${visualPackage.background.path}`);
  if (!visualPackage.background.path) throw new Error("Selected background asset path is empty");

  console.log(`  · Style Config: name="${visualPackage.style.name}", font="${visualPackage.style.fontFamily}"`);
  if (visualPackage.style.name !== "travel") throw new Error("Style name mismatch");

  console.log(`  · Composition elements: ${visualPackage.composition.elements.length} layout elements positioned.`);
  if (visualPackage.composition.elements.length === 0) throw new Error("Composition elements list is empty");

  console.log(`  · SceneVisualGraph root node: type="${visualPackage.graph.root.type}", kids=${visualPackage.graph.root.children?.length}`);
  if (visualPackage.graph.root.type !== "viewport") throw new Error("VisualGraph root viewport missing");

  console.log(yellow("\n2. Pipeline Execution Latency Metrics:"));
  const dbgMetrics = visualPackage.metadata.debug.metrics;
  for (const marker of Object.keys(dbgMetrics)) {
    console.log(`  · ${marker.padEnd(20)}: ${dbgMetrics[marker]} ms`);
  }

  // Verify backward compatibility façade
  console.log(yellow("\n3. Verifying Façade backward compatibility mapping..."));
  const facadeResults = await VisualAssetManager.getVisualPack({
    topic: "Japan",
    questions: [
      { question: "What is the capital?", options: ["Tokyo", "Kyoto"], answer: "Tokyo" }
    ],
    style: "quiz"
  });

  console.log(`  · Total pack elements generated: ${facadeResults.length}`);
  console.log(`  · Element 0 path: ${facadeResults[0].path}`);
  console.log(`  · Element 0 metadata storageKey: ${facadeResults[0].metadata.storageKey}`);
  console.log(`  · Element 0 metadata license (style): ${facadeResults[0].metadata.license}`);
  console.log(`  · Element 0 metadata credits: ${facadeResults[0].metadata.author}`);
  
  if (facadeResults.length !== 4) { // 1 hook + 2 per question (2) + 1 outro = 4
    throw new Error(`Expected 4 elements, got: ${facadeResults.length}`);
  }

  console.log(cyan("\n================================================================="));
  console.log(cyan("   🎉 ALL VISUAL INTELLIGENCE PIPELINE VERIFICATION TESTS PASSED  "));
  console.log(cyan("================================================================="));
}

testVisualPipeline().catch((err) => {
  console.error("\n❌ Visual pipeline verification failed:", err);
  process.exit(1);
});
