/**
 * TikTok / Instagram / X / Facebook Publishing Provider Stubs
 *
 * Each platform follows the same PublishingProvider interface.
 * Real implementations are wired in when API credentials are available.
 *
 * Env vars needed per platform (add to .env):
 *   TIKTOK_ACCESS_TOKEN, TIKTOK_OPEN_ID
 *   INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
 *   FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID
 */

import type { PublishingProvider, PublishPayload, PublishResult, PlatformHealth } from "../publishing-provider";

// ─────────────────────────────────────────────────────────────────────────────
// Shared stub factory
// ─────────────────────────────────────────────────────────────────────────────

function createStubProvider(
  id: string,
  name: string,
  envKey: string,
  supportsUpload = true
): PublishingProvider {
  return {
    id,
    name,
    async publish(payload: PublishPayload): Promise<PublishResult> {
      console.log(`[${name}] Stub publish for job ${payload.jobId} | title: "${payload.title}"`);
      return {
        platform: id,
        success: true,
        postId: `${id}_stub_${Date.now()}`,
        postUrl: `https://example.com/${id}/stub_${payload.jobId}`,
        publishedAt: new Date().toISOString(),
      };
    },
    async health(): Promise<boolean> {
      return !!process.env[envKey];
    },
    async healthCheck(): Promise<PlatformHealth> {
      const authOk = !!process.env[envKey];
      return {
        platform: id,
        state: authOk ? "ONLINE" : "AUTH_FAILED",
        reachable: true,
        authOk,
        checkedAt: new Date().toISOString(),
        error: authOk ? undefined : `${envKey} not set`,
      };
    },
    supportsDirectUpload: () => supportsUpload,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Providers
// ─────────────────────────────────────────────────────────────────────────────

export const TikTokProvider = createStubProvider(
  "tiktok",
  "TikTok",
  "TIKTOK_ACCESS_TOKEN",
  true
);

export const InstagramProvider = createStubProvider(
  "instagram",
  "Instagram",
  "INSTAGRAM_ACCESS_TOKEN",
  true
);

export const XProvider = createStubProvider(
  "x",
  "X (Twitter)",
  "X_API_KEY",
  false  // X API v2 does not support direct video upload without media endpoint
);

export const FacebookProvider = createStubProvider(
  "facebook",
  "Facebook",
  "FACEBOOK_PAGE_ACCESS_TOKEN",
  true
);
