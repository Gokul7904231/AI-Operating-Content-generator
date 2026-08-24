export interface ImageRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  style?: string;
  aspectRatio?: string;
  steps?: number;
  cfg?: number;
  quality?: number;
  model?: string;
  workflow?: string;
  engine?: string;
}

export interface ImageResult {
  provider: string;
  model: string;
  imagePath: string;
  cacheHit: boolean;
  latency: number;
  cost: number;
  tokens: number;
  generationTime: number;
  hash: string;
  metadata?: Record<string, any>;
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "offline";
  latency: number;
  lastChecked: number;
  errorRate: number;
  message?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  capabilities: string[];
  maxResolution?: string;
  supportsSeed: boolean;
  supportsCFG: boolean;
  supportsNegativePrompt: boolean;
}

export interface ImageProvider {
  id: string;
  name: string;
  priority: number;
  supports(model: string): boolean;
  generate(req: ImageRequest): Promise<ImageResult>;
  health(): Promise<HealthStatus>;
  listModels(): Promise<ModelInfo[]>;
  estimateCost(req: ImageRequest): number;
  estimateSpeed(req: ImageRequest): number;
}
