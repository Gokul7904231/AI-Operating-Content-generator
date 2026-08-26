/**
 * FactoryOS Frontier v3 — Google Gemini TTS Voice Provider
 * Specialized VOICE_GENERATION provider implementing Gemini's Audio Profile + Scene + Director's Notes architecture.
 * Uses official Gemini 3.1 Flash TTS model: gemini-3.1-flash-tts-preview
 */

import { EvidenceFactory, EvidenceRecord } from "../contracts/EvidenceRecord";

export interface GeminiTTSOptions {
  transcript: string;
  voice?: string; // e.g. "Aoede", "Charon", "Fenrir", "Kore", "Puck"
  style?: "NATURAL" | "DRAMATIC" | "ENERGETIC" | "CALM" | "STORYTELLER";
  scene?: string;
  directorNotes?: string;
  speakerConfig?: {
    isMultiSpeaker?: boolean;
    speakers?: Array<{ name: string; voice: string }>;
  };
  outputFormat?: "audio/mp3" | "audio/wav";
}

export interface GeminiTTSResult {
  audioBuffer?: Buffer | ArrayBuffer;
  audioBase64?: string;
  durationSeconds: number;
  mimeType: string;
  provider: "google_gemini_tts";
  model: string;
  voice: string;
  evidenceRecord: EvidenceRecord<{
    promptTokens?: number;
    latencyMs: number;
    directorNotesApplied: boolean;
    audioBytes: number;
  }>;
}

export class GeminiTTSProvider {
  static readonly PREFERRED_MODEL = "gemini-3.1-flash-tts-preview";
  static readonly FALLBACK_MODELS = [
    "gemini-2.5-flash-preview-tts",
  ];

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
    this.baseUrl = baseUrl || "https://generativelanguage.googleapis.com";
  }

  /**
   * Synthesizes high-fidelity speech from transcript using real Gemini TTS audio generation.
   */
  async synthesizeSpeech(options: GeminiTTSOptions): Promise<GeminiTTSResult> {
    const startTime = Date.now();
    const voice = options.voice || "Puck";
    const selectedModel = GeminiTTSProvider.PREFERRED_MODEL;

    if (!this.apiKey) {
      throw new Error("VOICE_GENERATION_UNAVAILABLE: GEMINI_API_KEY is not configured for speech synthesis.");
    }

    // Construct Director's Notes & Scene Prompt for steerable expressive speech
    const directorPrompt = `[Audio Profile: High-clarity, Studio Master]
[Scene Description: ${options.scene || "Engaging Short-Form Social Video"}]
[Voice Style: ${options.style || "NATURAL"}]
[Voice Name: ${voice}]
[Director's Notes: ${options.directorNotes || "Enunciate clearly, maintain energetic hook pacing, seamless natural pauses"}]
[Transcript]: "${options.transcript}"`;

    try {
      const endpoint = `${this.baseUrl.replace(/\/$/, "")}/v1beta/models/${selectedModel}:generateContent?key=${this.apiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: directorPrompt }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice
                }
              }
            }
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Gemini TTS API returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const candidatePart = data.candidates?.[0]?.content?.parts?.[0];
      const audioBase64 = candidatePart?.inlineData?.data;
      const mimeType = candidatePart?.inlineData?.mimeType || options.outputFormat || "audio/mp3";

      if (!audioBase64) {
        throw new Error("VOICE_GENERATION_UNAVAILABLE: Gemini TTS responded without audio payload.");
      }

      const audioBuffer = Buffer.from(audioBase64, "base64");
      const wordCount = options.transcript.split(/\s+/).filter(Boolean).length;
      const estimatedDuration = Math.max(1.5, parseFloat((wordCount / 2.5).toFixed(2)));
      const latencyMs = Date.now() - startTime;

      const evidence = EvidenceFactory.create(
        "ARTIFACT",
        "GeminiTTSProvider:gemini-3.1-flash-tts-preview",
        "SUCCESS",
        {
          latencyMs,
          directorNotesApplied: Boolean(options.directorNotes),
          audioBytes: audioBuffer.byteLength,
        },
        {
          claims: [`Generated ${audioBuffer.byteLength} bytes of real audio in ${latencyMs}ms`],
          metadata: {
            provider: "google_gemini_tts",
            model: selectedModel,
            latencyMs,
          }
        }
      );

      return {
        audioBuffer,
        audioBase64,
        durationSeconds: estimatedDuration,
        mimeType,
        provider: "google_gemini_tts",
        model: selectedModel,
        voice,
        evidenceRecord: evidence,
        evidence: evidence.data as any,
      } as any;
    } catch (err: any) {
      throw new Error(`VOICE_GENERATION_UNAVAILABLE: ${err.message}`);
    }
  }

  static getAvailableVoices(): Array<{ id: string; name: string; gender: string; description: string }> {
    return [
      { id: "Puck", name: "Puck (Gemini)", gender: "Male", description: "Energetic, clear narrative tone for viral shorts" },
      { id: "Charon", name: "Charon (Gemini)", gender: "Male", description: "Deep, authoritative documentary voice" },
      { id: "Kore", name: "Kore (Gemini)", gender: "Female", description: "Warm, natural educator and presenter voice" },
      { id: "Aoede", name: "Aoede (Gemini)", gender: "Female", description: "Polished, expressive storytelling voice" },
      { id: "Fenrir", name: "Fenrir (Gemini)", gender: "Male", description: "Fast-paced, bold cinematic voice" },
    ];
  }
}
