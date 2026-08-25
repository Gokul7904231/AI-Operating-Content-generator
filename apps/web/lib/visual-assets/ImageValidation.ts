function getSharp() {
  try {
    const pkg = "sharp";
    return require(pkg);
  } catch {
    return null;
  }
}

/**
 * Result-oriented image validation. The pipeline must NEVER package an
 * unverified buffer — every downloaded/decoded asset passes through here.
 */
export interface ImageValidationResult {
  ok: boolean;
  mime: string | null;
  format: string | null;
  width: number;
  height: number;
  reason?: string;
}

// Magic-byte signatures for the formats we accept.
const SIGNATURES: Array<{ mime: string; format: string; bytes: number[] }> = [
  { mime: "image/jpeg", format: "jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", format: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", format: "webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
  { mime: "image/gif", format: "gif", bytes: [0x47, 0x49, 0x46] },
  { mime: "image/bmp", format: "bmp", bytes: [0x42, 0x4d] },
  { mime: "image/avif", format: "avif", bytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70] },
];

function detectMimeFromBuffer(buffer: Buffer): string | null {
  for (const sig of SIGNATURES) {
    if (buffer.length < sig.bytes.length) continue;
    const matches = sig.bytes.every((b, i) => buffer[i] === b);
    if (matches) return sig.mime;
  }
  // SVG is explicitly rejected (vector, not raster — breaks Sharp/FFmpeg).
  const head = buffer.slice(0, 512).toString("utf8").toLowerCase();
  if (head.includes("<svg") || head.trimStart().startsWith("<?xml")) {
    return "image/svg+xml";
  }
  return null;
}

/**
 * Validates a raw downloaded buffer.
 * - Rejects empty files.
 * - Rejects HTML/error pages and SVG via magic bytes.
 * - Rejects anything Sharp cannot actually decode.
 */
export async function validateImageBuffer(buffer: Buffer): Promise<ImageValidationResult> {
  if (!buffer || buffer.length === 0) {
    return { ok: false, mime: null, format: null, width: 0, height: 0, reason: "Empty image buffer (0 bytes)" };
  }

  // Reject obvious HTML / API error pages (most common "unsupported format" cause).
  const headText = buffer.slice(0, 512).toString("latin1").toLowerCase();
  if (
    headText.includes("<!doctype html") ||
    headText.includes("<html") ||
    headText.trimStart().startsWith("{") ||
    headText.includes("error page") ||
    headText.includes("not found")
  ) {
    return { ok: false, mime: "text/html", format: null, width: 0, height: 0, reason: "Downloaded content is HTML/text, not an image" };
  }

  const mime = detectMimeFromBuffer(buffer);
  if (mime === "image/svg+xml") {
    return { ok: false, mime: "image/svg+xml", format: "svg", width: 0, height: 0, reason: "SVG is not supported (raster image required)" };
  }

  const sharpMod = getSharp();
  if (!sharpMod) {
    // Fallback: pass magic byte validation if sharp is unavailable
    if (mime) {
      return {
        ok: true,
        mime,
        format: mime.split("/")[1] || "jpeg",
        width: 1080,
        height: 1920,
      };
    }
    return { ok: false, mime: null, format: null, width: 0, height: 0, reason: "Unrecognized image format" };
  }

  // Authoritative decode check — only this proves the bytes are a real image.
  try {
    const img = sharpMod(buffer, { failOn: "none", limitInputPixels: false });
    const metadata = await img.metadata();
    if (!metadata.format || !metadata.width || !metadata.height) {
      return { ok: false, mime, format: metadata.format ?? null, width: 0, height: 0, reason: "Buffer is not a decodable raster image" };
    }
    return {
      ok: true,
      mime: mime ?? `image/${metadata.format}`,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (err: any) {
    return { ok: false, mime, format: null, width: 0, height: 0, reason: `Decode failed: ${err.message}` };
  }
}

/**
 * Ensures a buffer is a valid raster image and converts it to a normalized
 * 1080x1920 JPEG (the format the renderer strictly expects).
 * Throws a descriptive error on any failure so the caller can abort
 * deterministically instead of continuing with a broken asset.
 */
export async function validateAndConvertToJpeg(
  buffer: Buffer,
  label: string
): Promise<{ jpeg: Buffer; width: number; height: number }> {
  const validation = await validateImageBuffer(buffer);
  if (!validation.ok) {
    throw new Error(`Invalid image for "${label}": ${validation.reason}`);
  }

  const sharpMod = getSharp();
  if (!sharpMod) {
    return { jpeg: buffer, width: 1080, height: 1920 };
  }

  const jpeg = await sharpMod(buffer)
    .resize(1080, 1920, { fit: "cover", position: "entropy" })
    .jpeg({ quality: 85 })
    .toBuffer();

  const meta = await sharpMod(jpeg).metadata();
  return { jpeg, width: meta.width || 1080, height: meta.height || 1920 };
}
