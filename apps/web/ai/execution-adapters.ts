import { SpeechTask } from "./capability-registry";

export interface ExecutionAdapter {
  id: string; // unique identifier for the adapter implementation
}

export interface ChatAdapter extends ExecutionAdapter {
  generateText(
    params: {
      prompt: string;
      system?: string;
      temperature?: number;
      maxTokens?: number;
      responseFormat?: "text" | "json_object";
      model?: string;
    },
    signal?: AbortSignal
  ): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }>;
}

export interface ImageAdapter extends ExecutionAdapter {
  generateImage(
    params: {
      prompt: string;
      width: number;
      height: number;
      steps?: number;
      model?: string;
    },
    signal?: AbortSignal
  ): Promise<{ imageUrl: string; rawBytes?: Buffer }>;
}

export interface SpeechAdapter extends ExecutionAdapter {
  generateSpeech(
    params: {
      text: string;
      task: SpeechTask;
      voiceId: string;
      model?: string;
    },
    signal?: AbortSignal
  ): Promise<{ audioUrl: string; rawBytes?: Buffer }>;
}

export interface EmbeddingAdapter extends ExecutionAdapter {
  generateEmbeddings(
    texts: string[],
    signal?: AbortSignal
  ): Promise<{ embeddings: number[][]; usage: { tokens: number } }>;
}

export interface VisionAdapter extends ExecutionAdapter {
  analyzeImage(
    params: {
      imageUrl: string;
      prompt: string;
      model?: string;
    },
    signal?: AbortSignal
  ): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }>;
}
