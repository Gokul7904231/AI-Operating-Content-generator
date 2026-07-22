/**
 * Publishing Provider Interface
 *
 * Every publishing destination (YouTube, Instagram, TikTok, X, Facebook)
 * must implement this interface. Mirrors the StorageProvider pattern.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Publish Payload
// ─────────────────────────────────────────────────────────────────────────────

export interface PublishPayload {
  /** Drive or Cloudinary video URL. */
  videoUrl: string;
  /** Download link (used when platform needs direct file access). */
  downloadLink?: string;
  /** Video title. */
  title: string;
  /** Description / caption. */
  description?: string;
  /** Hashtags / tags. */
  tags?: string[];
  /** Thumbnail URL. */
  thumbnailUrl?: string;
  /** Engine that produced this video. */
  engine?: string;
  /** ShortFactory job ID. */
  jobId: string;
  /** Arbitrary platform-specific overrides. */
  platformOverrides?: Record<string, any>;
}

export interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  postUrl?: string;
  publishedAt: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Health
// ─────────────────────────────────────────────────────────────────────────────

export type PlatformState = "ONLINE" | "OFFLINE" | "AUTH_FAILED" | "RATE_LIMITED";

export interface PlatformHealth {
  platform: string;
  state: PlatformState;
  reachable: boolean;
  authOk: boolean;
  rateLimitRemainingSeconds?: number;
  checkedAt: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface PublishingProvider {
  /** Unique platform ID. e.g. "youtube" | "tiktok" | "instagram" */
  readonly id: string;

  /** Human-readable platform name. */
  readonly name: string;

  /**
   * Publish a video to this platform.
   */
  publish(payload: PublishPayload): Promise<PublishResult>;

  /**
   * Check platform auth, rate limits, and reachability.
   */
  healthCheck(): Promise<PlatformHealth>;

  /**
   * Quick liveness check.
   */
  health(): Promise<boolean>;

  /**
   * Whether this platform supports direct video uploads (vs link-only posts).
   */
  supportsDirectUpload(): boolean;
}
