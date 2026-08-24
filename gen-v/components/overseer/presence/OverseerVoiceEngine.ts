"use client";

/**
 * Overseer Voice Engine
 * Handles real-time Dictation with Web Audio API Frequency Analysis
 * and Speech Recognition for live ChatGPT-style audio visualization.
 */

export interface VoiceEngineCallbacks {
  onListeningStart?: () => void;
  onListeningEnd?: () => void;
  onInterimTranscript?: (transcript: string) => void;
  onFinalTranscript?: (transcript: string) => void;
  onVolumeChange?: (volume: number, frequencies: number[]) => void;
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
  
  // Web Audio API Visualizer state
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private audioDataArray: Uint8Array | null = null;

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
      recognition.continuous = true;
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
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          this.isListening = false;
          this.stopAudioAnalysis();
          this.callbacks.onError?.("Microphone permission was blocked. Please allow microphone access in your browser address bar.");
          this.callbacks.onListeningEnd?.();
        } else if (event.error !== "no-speech") {
          this.callbacks.onError?.(event.error);
        }
      };

      recognition.onend = () => {
        // If we are still marked as listening (e.g. continuous listening), don't auto-stop visualizer
        if (this.isListening) {
          // Restart recognition if user hasn't explicitly stopped
          try {
            recognition.start();
          } catch {
            this.isListening = false;
            this.stopAudioAnalysis();
            this.callbacks.onListeningEnd?.();
          }
        } else {
          this.stopAudioAnalysis();
          this.callbacks.onListeningEnd?.();
        }
      };

      this.recognition = recognition;
    }
  }

  /**
   * Starts Web Audio API microphone frequency & volume analysis
   */
  private async startAudioAnalysis(): Promise<boolean> {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      this.mediaStream = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      this.audioContext = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      this.analyser = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.audioDataArray = dataArray;

      const tickVisualizer = () => {
        if (!this.isListening || !this.analyser || !this.audioDataArray) return;

        (this.analyser as any).getByteFrequencyData(this.audioDataArray);

        // Compute normalized volume (0.0 to 1.0)
        let sum = 0;
        const count = Math.min(this.audioDataArray.length, 16);
        for (let i = 0; i < count; i++) {
          sum += this.audioDataArray[i];
        }
        const avg = sum / count;
        const normalizedVolume = Math.min(1.0, Math.max(0.05, avg / 128));

        // Sample 5 frequency bands for waveform bars
        const frequencies = [
          (this.audioDataArray[1] || 0) / 255,
          (this.audioDataArray[3] || 0) / 255,
          (this.audioDataArray[5] || 0) / 255,
          (this.audioDataArray[7] || 0) / 255,
          (this.audioDataArray[9] || 0) / 255,
        ];

        this.callbacks.onVolumeChange?.(normalizedVolume, frequencies);
        this.animationFrameId = requestAnimationFrame(tickVisualizer);
      };

      this.animationFrameId = requestAnimationFrame(tickVisualizer);
      return true;
    } catch (err: any) {
      console.warn("[OverseerVoiceEngine] MediaStream audio analysis notice:", err);
      this.callbacks.onError?.(
        err.name === "NotAllowedError"
          ? "Microphone permission denied. Please allow microphone access in your browser."
          : "Could not access microphone."
      );
      return false;
    }
  }

  private stopAudioAnalysis() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.analyser = null;
    this.audioDataArray = null;
  }

  /**
   * Starts Dictation mode (Speech to Text with live waveform visualization)
   */
  public startDictation() {
    this.mode = "dictate";
    this.stopSpeaking();
    this.isListening = true;

    // 1. MUST start SpeechRecognition synchronously in the click gesture handler
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (err: any) {
        console.warn("[OverseerVoiceEngine] Recognition start notice:", err);
      }
    } else {
      this.callbacks.onError?.("Speech recognition is not supported in this browser.");
      this.isListening = false;
      return;
    }

    this.callbacks.onListeningStart?.();

    // 2. Start Web Audio visualizer in background (does not block user gesture)
    this.startAudioAnalysis().catch((err) => {
      console.warn("[OverseerVoiceEngine] Background audio visualizer notice:", err);
    });
  }

  /**
   * Starts Hands-Free Live Voice Conversation Mode
   */
  public startVoiceConversation() {
    this.mode = "voice_conversation";
    this.stopSpeaking();
    this.isListening = true;

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch {}
    }

    this.callbacks.onListeningStart?.();
    this.startAudioAnalysis().catch(() => {});
  }

  public stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.stopAudioAnalysis();
    this.callbacks.onListeningEnd?.();
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

export default OverseerVoiceEngine;
