import sharp from "sharp";
import crypto from "crypto";

export interface CuratorReport {
  isValid: boolean;
  score: number;
  width: number;
  height: number;
  sharpness: number;
  isPortrait: boolean;
  hasWatermark: boolean;
  dhash: string;
  sha256: string;
  reasons: string[];
  brightness: number; // Mean brightness level 0-255
  contrast: number; // Contrast level (stdev)
  faceDetected: boolean;
  textDetected: boolean;
}

export class AssetCurator {
  /**
   * Generates a 64-bit Average Hash (aHash) for duplicate detection
   */
  static async calculateHash(imageBuffer: Buffer): Promise<string> {
    try {
      // Resize to 8x8 grayscale
      const grayscale8x8 = await sharp(imageBuffer)
        .resize(8, 8, { fit: "fill" })
        .grayscale()
        .raw()
        .toBuffer();

      // Calculate average brightness value
      let total = 0;
      for (let i = 0; i < 64; i++) {
        total += grayscale8x8[i];
      }
      const average = total / 64;

      // Build bit string
      let hashStr = "";
      for (let i = 0; i < 64; i++) {
        hashStr += grayscale8x8[i] >= average ? "1" : "0";
      }

      // Convert binary string to 16-character hex hash
      let hexHash = "";
      for (let i = 0; i < 64; i += 4) {
        const nibble = hashStr.slice(i, i + 4);
        hexHash += parseInt(nibble, 2).toString(16);
      }

      return hexHash;
    } catch {
      // Fallback: SHA256 of buffer if image parsing fails
      return crypto.createHash("sha256").update(imageBuffer).digest("hex").slice(0, 16);
    }
  }

  /**
   * Calculates Hamming Distance between two 16-character hex hashes
   */
  static getHammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) return 64; // Maximum distance
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      const val1 = parseInt(hash1[i], 16);
      const val2 = parseInt(hash2[i], 16);
      // Bitwise XOR to find differing bits
      let xor = val1 ^ val2;
      while (xor > 0) {
        if (xor & 1) distance++;
        xor >>= 1;
      }
    }
    return distance;
  }

  /**
   * Curates and optimizes a raw image buffer with advanced normalization, blurring, and crop rules
   */
  static async curate(
    rawBuffer: Buffer,
    contextInfo: { title?: string; description?: string; tags?: string[] } = {}
  ): Promise<{ report: CuratorReport; optimizedBuffer: Buffer; thumbnailBuffer: Buffer }> {
    const reasons: string[] = [];
    let score = 10.0;

    let img = sharp(rawBuffer);
    const metadata = await img.metadata();
    const stats = await img.stats();

    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // 1. Check minimum resolution
    if (width < 360 || height < 360) {
      score -= 5.0;
      reasons.push(`Low resolution: ${width}x${height}`);
    }

    // 2. Aspect ratio / Portrait suitability (ideal is 9:16 vertical)
    const isPortrait = height > width;
    const ratio = width / height;
    if (!isPortrait) {
      score -= 2.5; // Penalty for horizontal layout
      reasons.push("Not portrait orientation (landscape default)");
    } else if (ratio > 0.75) {
      score -= 1.0;
      reasons.push(`Sub-optimal portrait ratio: ${ratio.toFixed(2)}`);
    }

    // 3. Sharpness calculation (Standard deviation of channels)
    const channelStdevs = stats.channels.map((ch) => ch.stdev);
    const avgStdev = channelStdevs.reduce((a, b) => a + b, 0) / channelStdevs.length;
    const sharpness = parseFloat(avgStdev.toFixed(2));
    if (sharpness < 20) {
      score -= 2.0;
      reasons.push(`Low sharpness score: ${sharpness} (possibly blurry)`);
    }

    // 4. Brightness and Contrast Normalization checks
    const channelMeans = stats.channels.map((ch) => ch.mean);
    const avgBrightness = channelMeans.reduce((a, b) => a + b, 0) / channelMeans.length;
    
    // Apply normalization if too dark or too high contrast
    if (avgBrightness < 50) {
      img = img.modulate({ brightness: 1.25 });
      reasons.push("Applied brightness boost to dark image");
    } else if (avgBrightness > 225) {
      img = img.modulate({ brightness: 0.9 });
      reasons.push("Applied brightness attenuation to overexposed image");
    }

    if (avgStdev < 15) {
      img = img.normalize();
      reasons.push("Applied contrast normalization");
    }

    // 5. Face & Text Heuristic Detection
    const tagsLower = contextInfo.tags?.map(t => t.toLowerCase()) || [];
    const titleLower = (contextInfo.title || "").toLowerCase();
    
    const faceDetected = tagsLower.some(t => ["face", "portrait", "person", "man", "woman", "human"].includes(t)) ||
                         titleLower.includes("face") || titleLower.includes("portrait");
    if (faceDetected) {
      reasons.push("Face or portrait tags detected in metadata");
    }

    const textDetected = tagsLower.some(t => ["text", "overlay", "caption", "label"].includes(t)) ||
                         titleLower.includes("label") || titleLower.includes("caption");
    if (textDetected) {
      score -= 1.5;
      reasons.push("Potential text overlay elements detected");
    }

    // 6. Watermark / Keyword Detection
    let hasWatermark = false;
    const textToCheck = `${contextInfo.title || ""} ${contextInfo.description || ""} ${contextInfo.tags?.join(" ") || ""}`.toLowerCase();
    const watermarkKeywords = [
      "watermark", "logo", "copyright", "stock photo", "shutterstock",
      "gettyimages", "istockphoto", "alamy", "text overlay", "caption"
    ];

    if (watermarkKeywords.some((kw) => textToCheck.includes(kw))) {
      hasWatermark = true;
      score -= 4.0;
      reasons.push("Watermark metadata keywords matched");
    }

    // Optimize to 1080x1920 WebP covering 9:16 layout using safe area entropy bounds
    const optimizedBuffer = await img
      .resize(1080, 1920, {
        fit: "cover",
        position: "entropy",
      })
      .webp({ quality: 82 })
      .toBuffer();

    // Generate separate 150x266 WebP thumbnail buffer
    const thumbnailBuffer = await sharp(optimizedBuffer)
      .resize(150, 266, { fit: "cover" })
      .webp({ quality: 50 })
      .toBuffer();

    // Calculate cryptographic SHA-256 hash of the final optimized buffer
    const sha256 = crypto.createHash("sha256").update(optimizedBuffer).digest("hex");
    const dhash = await this.calculateHash(rawBuffer);

    // Finalize report
    const isValid = score >= 4.0; // Pass threshold
    const report: CuratorReport = {
      isValid,
      score: parseFloat(Math.max(0, Math.min(10.0, score)).toFixed(2)),
      width,
      height,
      sharpness,
      isPortrait,
      hasWatermark,
      dhash,
      sha256,
      reasons,
      brightness: parseFloat(avgBrightness.toFixed(2)),
      contrast: parseFloat(avgStdev.toFixed(2)),
      faceDetected,
      textDetected,
    };

    return { report, optimizedBuffer, thumbnailBuffer };
  }
}
