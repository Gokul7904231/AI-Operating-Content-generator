"use client";

/**
 * Overseer Voice Engine
 * Handles both Dictation (Speech-to-Text directly into input)
 * and Full Two-Way Voice Conversation (Speech -> AI Understanding -> Voice Response).
 */

export interface VoiceEngineCallbacks {
  onListeningStart?: () => void;
  onListeningEnd?: () => void;
  onInterimTranscript?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string) => void;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
  onError?: (error: string) => void;
}

export class OverseerVoiceEngine {
  private recognition: any = null;
  private isListening = false;
  private isSpeaking = false;
  private callbacks: VoiceEngineCallbacks = {};
  private mode: "dictate" | "voice_conversation" = "dictate";

  constructor(callbacks: VoiceEngineCallbacks = {}) {
    this.callbacks = callbacks;
    this.initSpeechRecognition();
  }

  public setCallbacks(callbacks: VoiceEngineCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private initSpeechRecognition() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        this.isListening = true;
        this.callbacks.onListeningStart?.();
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (interimTranscript) {
          this.callbacks.onInterimTranscript?.(interimTranscript);
        }

        if (finalTranscript) {
          this.callbacks.onFinalTranscript?.(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[OverseerVoiceEngine] Speech recognition notice:", event.error);
        this.isListening = false;
        this.callbacks.onError?.(event.error);
        this.callbacks.onListeningEnd?.();
      };

      recognition.onend = () => {
        this.isListening = false;
        this.callbacks.onListeningEnd?.();
      };

      this.recognition = recognition;
    }
  }

  /**
   * Starts Dictation mode (Speech to Text for input field)
   */
  public startDictation() {
    this.mode = "dictate";
    this.stopSpeaking();
    if (!this.recognition) {
      this.callbacks.onError?.("Speech recognition not supported in this browser.");
      return;
    }

    try {
      this.recognition.start();
    } catch {
      // Already running or starting
    }
  }

  /**
   * Starts Hands-Free Live Voice Conversation Mode
   */
  public startVoiceConversation() {
    this.mode = "voice_conversation";
    this.stopSpeaking();
    if (!this.recognition) {
      this.callbacks.onError?.("Speech recognition not supported in this browser.");
      return;
    }

    try {
      this.recognition.start();
    } catch {
      // Already running
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
  }

  /**
   * Speaks text using Overseer's synthesized voice persona
   */
  public speak(text: string, onEnd?: () => void) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnd?.();
      return;
    }

    this.stopSpeaking();
    this.stopListening();

    const cleanText = text
      .replace(/[*_#`]/g, "")
      .replace(/https?:\/\/\S+/g, "link")
      .trim();

    if (!cleanText) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = 1.05;
    utterance.rate = 1.02;
    utterance.volume = 0.95;

    // Pick a natural, articulate synthesized voice persona
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((v) =>
      /samantha|victoria|zira|karen|moira|google us english|natural|female/i.test(v.name)
    ) || voices.find((v) => v.lang.startsWith("en")) || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.callbacks.onSpeakingStart?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.callbacks.onSpeakingEnd?.();
      onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn("[OverseerVoiceEngine] Speech synthesis notice:", e);
      this.isSpeaking = false;
      this.callbacks.onSpeakingEnd?.();
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.callbacks.onSpeakingEnd?.();
    }
  }

  public getIsListening() {
    return this.isListening;
  }

  public getIsSpeaking() {
    return this.isSpeaking;
  }

  public getMode() {
    return this.mode;
  }
}
