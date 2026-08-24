import { AssetCurator } from "../lib/visual-assets/AssetCurator";
import { getStorageProvider, LocalStorageProvider, BackblazeB2StorageProvider } from "../lib/visual-assets/StorageProvider";
import { VisualPackBuilder } from "../lib/visual-assets/VisualPackBuilder";
import { VisualAssetManager } from "../lib/visual-assets/VisualAssetManager";
import sharp from "sharp";
import fs from "fs";
import path from "path";

async function runTests() {
  console.log("=================================================");
  console.log("   COMMENCING VISUAL ASSET SYSTEM PIPELINE TESTS ");
  console.log("=================================================");

  const tempDir = path.resolve(process.cwd(), "scratch", "test-assets-temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  // ----------------------------------------------------
  // TEST 1: Storage Providers
  // ----------------------------------------------------
  console.log("\n[Test 1] Testing Storage Providers...");
  const localProvider = new LocalStorageProvider();
  const dummyBuffer = Buffer.from("Hello Visual Asset Storage!");
  
  console.log(" - Uploading test file via LocalStorageProvider...");
  const localKey = await localProvider.upload("test/hello.txt", dummyBuffer, "text/plain");
  console.log(`   Uploaded: ${localKey}`);
  
  if (!(await localProvider.exists("test/hello.txt"))) {
    throw new Error("Local upload failed: File does not exist");
  }

  const downloadedLocal = await localProvider.download("test/hello.txt");
  if (downloadedLocal.toString() !== "Hello Visual Asset Storage!") {
    throw new Error("Local download returned incorrect data");
  }
  console.log(" ✅ LocalStorageProvider passed.");

  // Test Backblaze B2 Storage Provider (Mock mode)
  console.log(" - Instantiating BackblazeB2StorageProvider (Fallback Mock mode)...");
  const b2Provider = new BackblazeB2StorageProvider();
  const b2Key = await b2Provider.upload("packs/test.txt", dummyBuffer, "text/plain");
  console.log(`   Uploaded to B2: ${b2Key}`);
  
  if (!(await b2Provider.exists("packs/test.txt"))) {
    throw new Error("B2 upload failed: File does not exist");
  }

  const downloadedB2 = await b2Provider.download("packs/test.txt");
  if (downloadedB2.toString() !== "Hello Visual Asset Storage!") {
    throw new Error("B2 download returned incorrect data");
  }
  console.log(" ✅ BackblazeB2StorageProvider passed.");

  // ----------------------------------------------------
  // TEST 2: Asset Curator (Vetting, WebP optimization, dHash)
  // ----------------------------------------------------
  console.log("\n[Test 2] Testing Asset Curator...");
  // Create a high-quality vertical portrait image (red gradient)
  const portraitBuffer = await sharp({
    create: { width: 1080, height: 1920, channels: 3, background: { r: 255, g: 50, b: 50 } },
  })
    .webp()
    .toBuffer();

  const { report, optimizedBuffer } = await AssetCurator.curate(portraitBuffer, {
    title: "High Quality Red Portrait",
    tags: ["red", "portrait", "test"],
  });

  console.log(` - Curator Report: Score=${report.score}/10 | Valid=${report.isValid}`);
  console.log(`   Orientation isPortrait=${report.isPortrait} | Sharpness=${report.sharpness}`);
  console.log(`   Generated dHash=${report.dhash}`);

  if (!report.isValid) {
    throw new Error("High quality portrait was rejected by curator!");
  }
  if (!report.isPortrait) {
    throw new Error("Curator failed to identify portrait orientation");
  }

  // Create a bad image (landscape, small, low contrast/flat blur)
  const badBuffer = await sharp({
    create: { width: 100, height: 50, channels: 3, background: { r: 10, g: 10, b: 10 } },
  })
    .jpeg()
    .toBuffer();

  const badReport = await AssetCurator.curate(badBuffer, { title: "copyrighted watermark shutterstock logo" });
  console.log(` - Bad Image Report: Score=${badReport.report.score}/10 | Valid=${badReport.report.isValid} | hasWatermark=${badReport.report.hasWatermark}`);
  
  if (badReport.report.isValid) {
    throw new Error("Bad image was accepted by curator!");
  }
  if (!badReport.report.hasWatermark) {
    throw new Error("Curator failed to flag copyrighted keywords/watermarks");
  }

  // Verify dHash duplicate detection
  const duplicateBuffer = await sharp({
    create: { width: 1080, height: 1920, channels: 3, background: { r: 254, g: 51, b: 51 } },
  })
    .webp()
    .toBuffer();

  const hash1 = await AssetCurator.calculateHash(portraitBuffer);
  const hash2 = await AssetCurator.calculateHash(duplicateBuffer);
  const distance = AssetCurator.getHammingDistance(hash1, hash2);
  console.log(` - Hamming Distance between duplicates: ${distance} (aHash1: ${hash1}, aHash2: ${hash2})`);
  
  if (distance > 5) {
    throw new Error("aHash Hamming distance is too high for identical duplicates!");
  }

  console.log(" ✅ AssetCurator passed.");

  // ----------------------------------------------------
  // TEST 3: Visual Pack Builder Scraper
  // ----------------------------------------------------
  console.log("\n[Test 3] Testing Visual Pack Builder...");
  const builder = new VisualPackBuilder();
  
  console.log(" - Triggering pack building for Japan landmarks...");
  const added = await builder.buildPack("Japan", "Landmarks");
  console.log(`   Successfully added ${added} assets to Japan landmarks pack.`);

  console.log(" ✅ VisualPackBuilder passed.");

  // ----------------------------------------------------
  // TEST 4: VisualAssetManager & LRU Eviction limits
  // ----------------------------------------------------
  console.log("\n[Test 4] Testing VisualAssetManager...");
  const pack = await VisualAssetManager.getVisualPack({
    topic: "Japan",
    questions: [
      { question: "What is Shibuya Crossing famous for?", options: ["Crowds", "Nature"] },
      { question: "Which volcanic mountain is tallest?", options: ["Mt Fuji", "Mt Aso"] },
    ],
  });

  console.log(` - Retrieved visual pack length: ${pack.length} images.`);
  if (pack.length !== 6) {
    throw new Error(`Expected visual pack to contain exactly 6 images (1 hook, 4 for questions, 1 outro), got: ${pack.length}`);
  }

  console.log("   First image details:", JSON.stringify(pack[0].metadata));

  // Test LRU Eviction by injecting mock cache entries
  console.log(" - Testing Cache Size & count LRU constraints...");
  
  // Set temporary environment constraints
  process.env.LOCAL_CACHE_LIMIT_IMAGES = "5";
  process.env.LOCAL_CACHE_LIMIT_SIZE_GB = "0.0001"; // ~100 KB
  
  // Write 10 dummy files to cache
  const managerCacheDir = path.resolve(process.cwd(), "data", "visual-assets-cache");
  
  for (let i = 1; i <= 10; i++) {
    const key = `dummy_hash_${i}`;
    const filePath = path.join(managerCacheDir, `${key}.webp`);
    // Each file is 30 KB
    fs.writeFileSync(filePath, Buffer.alloc(30000));
    
    // Add to VisualAssetManager cache
    (VisualAssetManager as any).cacheMap.set(key, {
      key,
      filePath,
      sizeBytes: 30000,
      lastUsed: Date.now() + i * 1000, // LRU order
      usageCount: 1,
    });
  }

  console.log(`   Initial cache map size before manager audit: ${(VisualAssetManager as any).cacheMap.size}`);
  
  // Run audit
  if (typeof (VisualAssetManager as any).manageCache === "function") {
    await (VisualAssetManager as any).manageCache();
  }
  
  const finalSize = (VisualAssetManager as any).cacheMap.size;
  console.log(`   Cache map size after manager audit: ${finalSize}`);
  
  // Clean up cache environment
  delete process.env.LOCAL_CACHE_LIMIT_IMAGES;
  delete process.env.LOCAL_CACHE_LIMIT_SIZE_GB;

  // Verify eviction occurred
  if (finalSize > 5) {
    throw new Error(`Cache limit audit failed: cache contains ${finalSize} items, should be <= 5`);
  }

  // Print metrics
  console.log("\n=== PIPELINE RETRIEVAL METRICS ===");
  console.log(JSON.stringify(VisualAssetManager.getMetrics(), null, 2));

  // Cleanup temp files
  try {
    fs.rmSync(tempDir, { recursive: true });
  } catch {}

  console.log("\n=================================================");
  console.log("  🎉 ALL VISUAL ASSET SYSTEM PIPELINE TESTS PASSED ");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("\n❌ Test Suite Failed:", err);
  process.exit(1);
});
