/**
 * FactoryOS Frontier v2 — Overseer Voice Controller & Multimodal Synchronization
 * Manages turn-taking, barge-in interruptibility, speech state transitions, and acoustic modulation.
 */

import type { VoiceState } from "./OverseerPresenceContracts";

export interface VoiceUtterance {
  id: string;
  text: string;
  speaker: "user" | "overseer";
  startedAt: string;
  completedAt?: string;
}

export class OverseerVoiceController {
  private currentState: VoiceState = "IDLE";
  private currentUtterance: VoiceUtterance | null = null;
  private speechAmplitude: number = 0.0;
  private isMuted: boolean = false;

  getVoiceState(): VoiceState {
    return this.isMuted ? "MUTED" : this.currentState;
  }

  getSpeechAmplitude(): number {
    return this.speechAmplitude;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && this.currentState === "SPEAKING") {
      this.cancelSpeech("User muted voice");
    }
  }

  /**
   * User starts speaking -> transition to LISTENING with barge-in cancellation.
   */
  startListening(): void {
    if (this.currentState === "SPEAKING") {
      this.cancelSpeech("Barge-in interrupt: User started speaking");
    }
    this.currentState = "LISTENING";
    this.currentUtterance = {
      id: `utt_user_${Date.now()}`,
      text: "",
      speaker: "user",
      startedAt: new Date().toISOString(),
    };
  }

  /**
   * User speech ended -> transition to PROCESSING.
   */
  finishListening(transcript: string): VoiceUtterance | null {
    if (this.currentUtterance) {
      this.currentUtterance.text = transcript;
      this.currentUtterance.completedAt = new Date().toISOString();
    }
    this.currentState = "PROCESSING";
    return this.currentUtterance;
  }

  /**
   * Overseer begins speaking a response.
   */
  startSpeaking(text: string): VoiceUtterance {
    this.currentState = "SPEAKING";
    this.speechAmplitude = 0.6;
    this.currentUtterance = {
      id: `utt_overseer_${Date.now()}`,
      text,
      speaker: "overseer",
      startedAt: new Date().toISOString(),
    };
    return this.currentUtterance;
  }

  /**
   * Updates real-time audio amplitude during speech (e.g. from Web Audio analyser or simulated syllables).
   */
  updateAmplitude(amp: number): void {
    this.speechAmplitude = Math.max(0.0, Math.min(1.0, amp));
  }

  /**
   * Overseer finished speaking -> return to IDLE.
   */
  finishSpeaking(): void {
    if (this.currentState === "SPEAKING") {
      this.currentState = "IDLE";
      this.speechAmplitude = 0.0;
      if (this.currentUtterance) {
        this.currentUtterance.completedAt = new Date().toISOString();
      }
    }
  }

  /**
   * Barge-in cancellation.
   */
  cancelSpeech(reason: string): void {
    if (this.currentState === "SPEAKING") {
      this.currentState = "IDLE";
      this.speechAmplitude = 0.0;
      if (this.currentUtterance) {
        this.currentUtterance.completedAt = new Date().toISOString();
      }
    }
  }
}
