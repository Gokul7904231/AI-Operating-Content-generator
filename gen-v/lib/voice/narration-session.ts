import { VoiceProvider } from "./voice-provider";

export interface NarrationSession {
  readonly sessionId: string;
  readonly videoId: string;
  readonly providerId: string;
  readonly provider: VoiceProvider;
  readonly introVoiceId: string;
  readonly mainVoiceId: string;
  readonly language: "en-US";
  readonly sampleRate: number;
  readonly modelId?: string;
  readonly createdAt: number;
}

export interface NarrationClipReport {
  sceneIndex: number;
  narrative: string;
  duration: number;
  status: "ok" | "failed";
  cacheHit: boolean;
  attempts: number;
}

export interface NarrationReport {
  videoId: string;
  sessionId: string;
  providerId: string;
  introVoiceId: string;
  mainVoiceId: string;
  language: "en-US";
  totalDuration: number;
  clips: NarrationClipReport[];
  failures: string[];
  retriesCount: number;
  createdAt: number;
}
