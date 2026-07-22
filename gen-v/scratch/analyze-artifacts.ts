import fs from "fs";
import path from "path";
import sharp from "sharp";

async function analyzeImage(imgPath: string) {
  if (!fs.existsSync(imgPath)) {
    console.log(`[Image Analysis] ${path.basename(imgPath)}: FILE MISSING!`);
    return;
  }
  
  try {
    const image = sharp(imgPath);
    const metadata = await image.metadata();
    const stats = await image.stats();
    
    console.log(`[Image Analysis] ${path.basename(imgPath)}:`);
    console.log(`  - Dimensions: ${metadata.width}x${metadata.height}`);
    console.log(`  - Format:     ${metadata.format}`);
    
    // Check if the image is solid color by inspecting channel stats
    const isSolidColor = stats.channels.every(ch => ch.min === ch.max);
    console.log(`  - Min/Max per channel:`, stats.channels.map(ch => `[min: ${ch.min}, max: ${ch.max}, mean: ${ch.mean.toFixed(1)}]`).join(" | "));
    console.log(`  - Is Solid Color:     ${isSolidColor ? "YES ❌" : "NO ✅ (Contains varying pixel values)"}`);
  } catch (err: any) {
    console.error(`[Image Analysis] Error reading ${path.basename(imgPath)}:`, err.message);
  }
}

function analyzeAudio(wavPath: string) {
  if (!fs.existsSync(wavPath)) {
    console.log(`[Audio Analysis] ${path.basename(wavPath)}: FILE MISSING!`);
    return;
  }
  
  try {
    const buffer = fs.readFileSync(wavPath);
    // Find data chunk
    let offset = 12;
    let dataOffset = -1;
    let dataSize = 0;
    while (offset + 8 <= buffer.length) {
      const chunkId = buffer.toString("utf8", offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);
      if (chunkId === "data") {
        dataOffset = offset + 8;
        dataSize = chunkSize;
        break;
      }
      offset += 8 + chunkSize;
    }
    
    if (dataOffset === -1) {
      console.log(`[Audio Analysis] ${path.basename(wavPath)}: Invalid WAV format (No data chunk).`);
      return;
    }
    
    const samplesCount = Math.floor(Math.min(dataSize, buffer.length - dataOffset) / 2);
    let sumSquared = 0;
    for (let i = 0; i < samplesCount; i++) {
      const val = buffer.readInt16LE(dataOffset + i * 2) / 32768;
      sumSquared += val * val;
    }
    
    const rms = Math.sqrt(sumSquared / (samplesCount || 1));
    console.log(`[Audio Analysis] ${path.basename(wavPath)}:`);
    console.log(`  - Duration:  ${(samplesCount / 44100).toFixed(2)}s`);
    console.log(`  - RMS Level: ${rms.toFixed(5)}`);
    console.log(`  - Is Silent: ${rms < 0.0001 ? "YES ❌ (rms < 0.0001)" : "NO ✅"}`);
  } catch (err: any) {
    console.error(`[Audio Analysis] Error reading ${path.basename(wavPath)}:`, err.message);
  }
}

async function main() {
  // Let's find the latest job directory in AppData Temp
  const tempBase = path.join(process.env.LOCALAPPDATA || "", "Temp", "ShortFactory", "temp");
  if (!fs.existsSync(tempBase)) {
    console.error("Temp directory does not exist at:", tempBase);
    return;
  }
  
  const jobs = fs.readdirSync(tempBase).filter(f => f.startsWith("job_"));
  if (jobs.length === 0) {
    console.error("No jobs found in:", tempBase);
    return;
  }
  
  // Sort by modification time to get latest
  jobs.sort((a, b) => {
    return fs.statSync(path.join(tempBase, b)).mtimeMs - fs.statSync(path.join(tempBase, a)).mtimeMs;
  });
  
  const latestJobDir = path.join(tempBase, jobs[0]);
  console.log(`Analyzing artifacts for latest job at: ${latestJobDir}\n`);
  
  const files = fs.readdirSync(latestJobDir);
  const images = files.filter(f => f.endsWith(".jpg")).sort();
  const audios = files.filter(f => f.endsWith("_voice.wav")).sort();
  
  console.log("=== IMAGE ANALYSIS ===");
  for (const img of images) {
    await analyzeImage(path.join(latestJobDir, img));
  }
  
  console.log("\n=== AUDIO ANALYSIS ===");
  for (const aud of audios) {
    analyzeAudio(path.join(latestJobDir, aud));
  }
}

main();
