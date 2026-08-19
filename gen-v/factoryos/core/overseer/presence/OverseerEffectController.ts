/**
 * FactoryOS Frontier v2 — Overseer Visual Effect Controller
 * Manages performance budgets, GPU particle parameters, aura intensity, and interaction shockwaves.
 */

import type {
  OverseerIntent,
  OverseerAffectState,
  VisualEffectLevel,
} from "./OverseerPresenceContracts";

export interface ParticleConfig {
  count: number;
  speed: number;
  convergenceForce: number; // Positive = pulling into face, Negative = radiating out
  color: string;
  size: number;
  opacity: number;
}

export interface AuraConfig {
  intensity: number;
  radius: number;
  pulseSpeed: number;
  color: string;
}

export interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
  createdAt: number;
}

export class OverseerEffectController {
  private effectLevel: VisualEffectLevel = 3;
  private prefersReducedMotion: boolean = false;
  private isLowPowerMode: boolean = false;
  private activeRipples: RippleEffect[] = [];

  constructor(options: { effectLevel?: VisualEffectLevel; prefersReducedMotion?: boolean } = {}) {
    if (options.effectLevel !== undefined) this.effectLevel = options.effectLevel;
    if (options.prefersReducedMotion !== undefined) this.prefersReducedMotion = options.prefersReducedMotion;
  }

  setReducedMotion(reduced: boolean): void {
    this.prefersReducedMotion = reduced;
  }

  setLowPowerMode(lowPower: boolean): void {
    this.isLowPowerMode = lowPower;
  }

  setEffectLevel(level: VisualEffectLevel): void {
    this.effectLevel = level;
  }

  getEffectiveLevel(intent: OverseerIntent): VisualEffectLevel {
    if (this.prefersReducedMotion) return 1; // Basic face only
    if (this.isLowPowerMode) return Math.min(2, this.effectLevel) as VisualEffectLevel;

    // Dynamically elevate for cinematic milestones
    if (intent === "SUCCESS" || intent === "PROUD") {
      return Math.min(5, Math.max(this.effectLevel, 4)) as VisualEffectLevel;
    }
    if (intent === "CRITICAL") {
      return Math.min(4, Math.max(this.effectLevel, 3)) as VisualEffectLevel;
    }
    if (intent === "DEEP_THINKING") {
      return Math.min(4, Math.max(this.effectLevel, 3)) as VisualEffectLevel;
    }

    return this.effectLevel;
  }

  getParticleConfig(intent: OverseerIntent, affect: OverseerAffectState, accentColor: string): ParticleConfig {
    if (this.prefersReducedMotion || this.effectLevel < 3) {
      return { count: 0, speed: 0, convergenceForce: 0, color: accentColor, size: 0, opacity: 0 };
    }

    switch (intent) {
      case "DEEP_THINKING":
        return {
          count: 80,
          speed: 1.2,
          convergenceForce: 0.8, // Inward flow toward eyes
          color: accentColor,
          size: 2.5,
          opacity: 0.75,
        };
      case "THINKING":
      case "OBSERVING":
        return {
          count: 45,
          speed: 0.7,
          convergenceForce: 0.3,
          color: accentColor,
          size: 2.0,
          opacity: 0.6,
        };
      case "CRITICAL":
      case "WARNING":
        return {
          count: 90,
          speed: 2.2,
          convergenceForce: -0.6, // Rapid outward radiating
          color: accentColor,
          size: 3.0,
          opacity: 0.85,
        };
      case "SUCCESS":
      case "PROUD":
        return {
          count: 100,
          speed: 1.8,
          convergenceForce: -1.0, // Celebratory burst
          color: accentColor,
          size: 3.2,
          opacity: 0.9,
        };
      case "RECOVERING":
        return {
          count: 50,
          speed: 0.9,
          convergenceForce: 0.1,
          color: accentColor,
          size: 2.2,
          opacity: 0.65,
        };
      case "IDLE":
      default:
        return {
          count: 25,
          speed: 0.3,
          convergenceForce: 0.0, // Gentle ambient drift
          color: accentColor,
          size: 1.8,
          opacity: 0.35,
        };
    }
  }

  getAuraConfig(intent: OverseerIntent, affect: OverseerAffectState, accentColor: string): AuraConfig {
    if (this.prefersReducedMotion || this.effectLevel < 2) {
      return { intensity: 0.2, radius: 120, pulseSpeed: 0.2, color: accentColor };
    }

    const intensity = Math.min(1.0, 0.3 + affect.urgency * 0.4 + affect.arousal * 0.3);
    const pulseSpeed = intent === "CRITICAL" ? 2.5 : intent === "DEEP_THINKING" ? 1.4 : 0.5;

    return {
      intensity,
      radius: 140 + affect.arousal * 60,
      pulseSpeed,
      color: accentColor,
    };
  }

  addInteractionRipple(x: number, y: number, color: string = "#00e5ff"): void {
    if (this.prefersReducedMotion || this.effectLevel < 2) return;
    this.activeRipples.push({
      x,
      y,
      radius: 10,
      maxRadius: 160,
      opacity: 0.8,
      color,
      createdAt: Date.now(),
    });
    if (this.activeRipples.length > 8) this.activeRipples.shift();
  }

  updateRipples(): RippleEffect[] {
    const now = Date.now();
    this.activeRipples = this.activeRipples
      .map((r) => {
        const age = now - r.createdAt;
        const progress = Math.min(1.0, age / 600);
        return {
          ...r,
          radius: 10 + progress * (r.maxRadius - 10),
          opacity: (1.0 - progress) * 0.8,
        };
      })
      .filter((r) => r.opacity > 0.02);

    return [...this.activeRipples];
  }
}
