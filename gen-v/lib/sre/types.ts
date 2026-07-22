/**
 * ShortFactory OS — SRE Audit System Types
 * Central type definitions for the entire 19-phase audit infrastructure.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core Enums & Status Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuditStatus = "pass" | "fail" | "skip" | "degraded" | "unknown";
export type ProviderTier = "primary" | "secondary" | "fallback" | "specialized";
export type ProviderCategory = "llm" | "image" | "tts" | "embedding" | "storage" | "publish";

// ─────────────────────────────────────────────────────────────────────────────
// Discovered Provider
// ─────────────────────────────────────────────────────────────────────────────

export interface DiscoveredProvider {
  id: string;
  name: string;
  category: ProviderCategory;
  envKey: string;          // The env var name for the API key
  apiKey: string;          // The actual key value (masked in reports)
  baseUrl: string;
  keyPrefix: string;       // Expected prefix e.g. "AIza", "gsk_"
  tier: ProviderTier;
  enabled: boolean;
  source: "env" | "providers.json" | "registry" | "inferred";
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment Verification
// ─────────────────────────────────────────────────────────────────────────────

export interface EnvIssue {
  severity: "critical" | "warning" | "info";
  category: "missing" | "duplicate" | "malformed" | "naming" | "security" | "deprecated";
  key: string;
  message: string;
  recommendation: string;
}

export interface EnvVerificationResult {
  phase: 2;
  totalKeys: number;
  validKeys: number;
  issues: EnvIssue[];
  providersDetected: string[];
  securityScore: number; // 0-100
}

// ─────────────────────────────────────────────────────────────────────────────
// Endpoint Health
// ─────────────────────────────────────────────────────────────────────────────

export interface EndpointHealthResult {
  providerId: string;
  providerName: string;
  status: "healthy" | "degraded" | "offline";
  latencyMs: number;
  dnsOk: boolean;
  httpsOk: boolean;
  tlsOk: boolean;
  authOk: boolean;
  statusCode: number;
  errorMessage?: string;
  retryCount: number;
  availabilityPct: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Discovery
// ─────────────────────────────────────────────────────────────────────────────

export interface DiscoveredModel {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  contextWindow: number;
  supportsStreaming: boolean;
  supportsJsonMode: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  supportsEmbeddings: boolean;
  supportsImage: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
  isDeprecated: boolean;
  isFree: boolean;
  costInputPer1M: number;
  costOutputPer1M: number;
  discoveredAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Capability Tests
// ─────────────────────────────────────────────────────────────────────────────

export type CapabilityName =
  | "TEXT" | "JSON" | "REASONING" | "CODE" | "STREAMING"
  | "VISION" | "IMAGE" | "EMBEDDING" | "TTS" | "OCR"
  | "FUNCTION_CALLING" | "LONG_CONTEXT";

export interface CapabilityTestResult {
  capability: CapabilityName;
  providerId: string;
  modelId: string;
  status: AuditStatus;
  latencyMs: number;
  outputValid: boolean;
  outputPreview?: string;
  errorMessage?: string;
  tokenCount?: number;
  tokensPerSec?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Functional Tests
// ─────────────────────────────────────────────────────────────────────────────

export interface FunctionalTestResult {
  testName: string;
  providerId: string;
  modelId: string;
  status: AuditStatus;
  latencyMs: number;
  expectedOutput?: string;
  actualOutput?: string;
  outputValid: boolean;
  streamingWorked?: boolean;
  jsonValid?: boolean;
  tokenCount?: number;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Performance Benchmark
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelBenchmark {
  modelId: string;
  providerId: string;
  requestCount: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRate: number;     // 0.0 to 1.0
  failureRate: number;
  retryCount: number;
  timeoutCount: number;
  avgTokensPerSec: number;
  throughputRpm: number;
  totalCostUSD: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stress Test
// ─────────────────────────────────────────────────────────────────────────────

export interface StressTestLevel {
  concurrency: number;
  successCount: number;
  failureCount: number;
  rateLimited429: number;
  serviceUnavailable503: number;
  timeouts: number;
  avgLatencyMs: number;
  recoveryMs: number;
}

export interface StressTestResult {
  providerId: string;
  modelId: string;
  levels: StressTestLevel[];
  maxSustainedConcurrency: number;
  breakingPoint: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limit Detection
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimitInfo {
  providerId: string;
  inferredRpm: number;
  inferredTpm: number;
  dailyLimit: number;
  monthlyLimit: number;
  remaining: number;
  resetAtMs: number;
  retryAfterMs: number;
  headersFound: string[];
  source: "headers" | "inferred" | "documented" | "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// Router Fallback Verification
// ─────────────────────────────────────────────────────────────────────────────

export interface RouterFallbackStep {
  providerId: string;
  wasDisabled: boolean;
  fallbackTriggered: boolean;
  fallbackTarget: string;
  latencyMs: number;
  success: boolean;
}

export interface RouterVerificationResult {
  steps: RouterFallbackStep[];
  fullChainCovered: boolean;
  fallbackSuccess: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Provider Comparison
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageProviderResult {
  providerId: string;
  prompt: string;
  latencyMs: number;
  success: boolean;
  widthPx: number;
  heightPx: number;
  fileSizeBytes: number;
  format: string;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Audit
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageAuditResult {
  provider: string;
  uploadOk: boolean;
  downloadOk: boolean;
  deleteOk: boolean;
  checksumMatch: boolean;
  uploadLatencyMs: number;
  downloadLatencyMs: number;
  metadataOk: boolean;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Publisher Audit
// ─────────────────────────────────────────────────────────────────────────────

export interface PublisherAuditResult {
  platform: string;
  queueReachable: boolean;
  oauthValid: boolean;
  historyAccessible: boolean;
  dryRunSuccess: boolean;
  note: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Audit
// ─────────────────────────────────────────────────────────────────────────────

export interface SecurityAuditResult {
  noKeyLeakInLogs: boolean;
  noStackTracesExposed: boolean;
  noClientSideSecrets: boolean;
  internalKeyStrong: boolean;
  issues: string[];
  score: number; // 0-100
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Score (Live Composite)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProviderScore {
  providerId: string;
  providerName: string;
  overallScore: number;     // 0-100
  healthScore: number;
  latencyScore: number;
  availabilityScore: number;
  quotaScore: number;
  capabilityScore: number;
  reliabilityScore: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  recommendation: string;
  bestFor: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Capability Registry Entry
// ─────────────────────────────────────────────────────────────────────────────

export interface CapabilityRoute {
  capability: CapabilityName;
  primaryModel: string;
  primaryProvider: string;
  fallbackChain: Array<{ modelId: string; providerId: string; score: number }>;
  confidence: number; // 0-100
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Doctor Provider Card
// ─────────────────────────────────────────────────────────────────────────────

export interface DoctorProviderCard {
  providerId: string;
  providerName: string;
  overallStatus: "healthy" | "degraded" | "offline";
  latencyMs: number;
  capabilityResults: Record<CapabilityName, AuditStatus>;
  rateLimitStatus: "ok" | "warning" | "exceeded";
  quotaRemainingPct: number;
  currentModel: string;
  lastSuccessAt: string;
  lastErrorAt?: string;
  lastErrorMsg?: string;
  errorsPerHour: number;
  fallbackTarget?: string;
  suggestedReplacement?: string;
  score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Historical Health Snapshot
// ─────────────────────────────────────────────────────────────────────────────

export interface HealthSnapshot {
  timestamp: string;
  providerId: string;
  latencyMs: number;
  quotaRemainingPct: number;
  failureRate: number;
  status: "healthy" | "degraded" | "offline";
  errors: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Marketplace Entry
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketplaceModel {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  capabilities: CapabilityName[];
  contextWindow: number;
  latencyMs: number;
  successRate: number;
  costPer1MTokens: number;
  isFree: boolean;
  health: "healthy" | "degraded" | "offline";
  score: number;
  recommendedFor: string[];
  badge?: "fastest" | "cheapest" | "best-reasoning" | "best-coding" | "best-json" | "best-vision";
}

// ─────────────────────────────────────────────────────────────────────────────
// Final SRE Audit Report
// ─────────────────────────────────────────────────────────────────────────────

export interface SREAuditReport {
  id: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;

  // Phase results
  phase1_providers: DiscoveredProvider[];
  phase2_env: EnvVerificationResult;
  phase3_health: EndpointHealthResult[];
  phase4_models: DiscoveredModel[];
  phase5_capabilities: CapabilityTestResult[];
  phase6_functional: FunctionalTestResult[];
  phase7_benchmarks: ModelBenchmark[];
  phase8_stress?: StressTestResult[];  // opt-in
  phase9_rateLimits: RateLimitInfo[];
  phase10_router: RouterVerificationResult;
  phase11_imageProviders: ImageProviderResult[];
  phase12_storage: StorageAuditResult[];
  phase13_publisher: PublisherAuditResult[];
  phase14_security: SecurityAuditResult;
  phase15_cache: { cacheHit: boolean; providerCallSkipped: boolean };
  phase16_eventbus: { eventsVerified: string[]; allPresent: boolean };
  phase17_dashboard: { dataFresh: boolean; sseFunctional: boolean };
  phase18_doctorCards: DoctorProviderCard[];
  phase19_summary: SRESummary;

  // Derived
  providerScores: ProviderScore[];
  capabilityRoutes: CapabilityRoute[];
  marketplaceModels: MarketplaceModel[];
}

export interface SRESummary {
  totalProviders: number;
  workingProviders: number;
  degradedProviders: number;
  offlineProviders: number;
  avgLatencyMs: number;
  fastestProvider: string;
  fastestModel: string;
  bestCodingModel: string;
  bestReasoningModel: string;
  bestJsonModel: string;
  bestImageProvider: string;
  bestEmbeddingModel: string;
  missingApiKeys: string[];
  deprecatedModels: string[];
  invalidModels: string[];
  fallbackCoverage: number; // 0-100
  securityIssues: string[];
  optimizationSuggestions: string[];
  productionReady: boolean;
  overallScore: number; // 0-100
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE Progress Events
// ─────────────────────────────────────────────────────────────────────────────

export interface SREProgressEvent {
  type: "phase_start" | "phase_complete" | "phase_fail" | "audit_complete" | "log";
  phase?: number;
  phaseName?: string;
  message: string;
  timestamp: string;
  data?: any;
}
