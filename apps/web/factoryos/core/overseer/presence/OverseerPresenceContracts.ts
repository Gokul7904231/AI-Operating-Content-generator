/**
 * FactoryOS Frontier v2 — Overseer Presence Subsystem Contracts
 * Defines types for Intent, Affect, Attention, Expression, Voice, Effects, and Presence Envelopes.
 */

export type OverseerIntent =
  | "IDLE"
  | "GREETING"
  | "LISTENING"
  | "OBSERVING"
  | "THINKING"
  | "DEEP_THINKING"
  | "CURIOUS"
  | "CONCERNED"
  | "WARNING"
  | "CRITICAL"
  | "RECOVERING"
  | "VERIFYING"
  | "SUCCESS"
  | "PROUD"
  | "WAITING"
  | "FAREWELL"
  | "SLEEP";

export type IntentPriority =
  | "CRITICAL_SAFETY"  // 6 - Critical incidents, emergency failures
  | "ACTIVE_INCIDENT"  // 5 - Active investigations, recovery
  | "HIGH_MISSION"     // 4 - Mission milestones, verification
  | "USER_INTERACTION" // 3 - User talking / listening / direct chat
  | "NORMAL_FACTORY"   // 2 - Routine floor actions, background tasks
  | "CASUAL_AMBIENT"   // 1 - Ambient observations, greetings, idle glances
  | "IDLE";            // 0 - Pure idle baseline

export const INTENT_PRIORITY_RANK: Record<IntentPriority, number> = {
  CRITICAL_SAFETY: 6,
  ACTIVE_INCIDENT: 5,
  HIGH_MISSION: 4,
  USER_INTERACTION: 3,
  NORMAL_FACTORY: 2,
  CASUAL_AMBIENT: 1,
  IDLE: 0,
};

export interface OverseerAffectState {
  valence: number;       // -1.0 (very negative) to +1.0 (very positive)
  arousal: number;       // 0.0 (calm) to 1.0 (high energy/urgency)
  confidence: number;    // 0.0 (uncertain) to 1.0 (certain)
  uncertainty: number;   // 0.0 (known) to 1.0 (unknown/ambiguous)
  curiosity: number;     // 0.0 to 1.0 (seeking evidence)
  urgency: number;       // 0.0 to 1.0 (time-critical)
  satisfaction: number;  // 0.0 to 1.0 (objective achieved)
  concern: number;       // 0.0 to 1.0 (anomaly/risk detected)
  frustration: number;   // 0.0 to 1.0 (repeated failures/stalls)
}

export type AttentionTargetType =
  | "factory"
  | "floor01_strategy"
  | "floor02_scripting"
  | "floor03_asset_realization"
  | "floor07_compliance"
  | "worker"
  | "case"
  | "mission"
  | "user"
  | "chat"
  | "voiceInput";

export interface AttentionTarget {
  target: AttentionTargetType;
  targetId?: string;
  reason: string;
  priority: "CRITICAL" | "HIGH" | "NORMAL" | "LOW";
  confidence: number;
  gazeX: number; // Normalized -1.0 (left) to +1.0 (right)
  gazeY: number; // Normalized -1.0 (up) to +1.0 (down)
  startedAt: string;
  durationMs: number;
  expiresAt: string;
}

export interface EyeParameters {
  openness: number;     // 0.0 (closed) to 1.0 (wide open)
  width: number;        // Eye scale width (e.g. 1.0)
  height: number;       // Eye scale height (e.g. 1.0)
  pupilScale: number;   // 0.5 (contracted) to 1.5 (dilated)
  gazeX: number;        // -1.0 (left) to 1.0 (right)
  gazeY: number;        // -1.0 (up) to 1.0 (down)
  eyebrowAngle: number; // degrees: negative = concerned/inward, positive = skeptical/upward
  blinkAmount: number;  // 0.0 (open) to 1.0 (fully blinked)
  softness: number;     // 0.0 (sharp robotic edge) to 1.0 (smooth glow)
}

export interface FaceParameters {
  eye: EyeParameters;
  mouthCurve: number;      // -1.0 (serious/frown) to +1.0 (subtle smile)
  mouthOpenness: number;   // 0.0 (closed) to 1.0 (speaking aperture)
  headTilt: number;        // -15 to +15 degrees
  faceScale: number;       // 0.9 to 1.1
  glowIntensity: number;   // 0.0 to 1.0
  accentColor: string;     // Hex/HSL color code for illumination (e.g. "#00e5ff", "#ff3366", "#00e676")
  pulseFrequency: number;  // Hz (e.g. 0.5 for calm breathing, 2.0 for warning)
}

export type VoiceState =
  | "IDLE"
  | "LISTENING"
  | "PROCESSING"
  | "SPEAKING"
  | "MUTED";

export type VisualEffectLevel =
  | 0 // STATIC (No motion, static rendering, low-power fallback)
  | 1 // FACE (Basic face rendering, deterministic geometry)
  | 2 // FACE + MOTION (Smooth spring interpolation, procedural blink)
  | 3 // FACE + PARTICLES (Subtle particle field)
  | 4 // WEBGL EFFECTS (Aura glow, interaction ripples, dynamic shaders)
  | 5; // CINEMATIC EVENT (Celebratory or critical shockwave burst, capped duration)

export interface ActiveIntentRecord {
  intent: OverseerIntent;
  priority: IntentPriority;
  cause: string;
  sourceEvent?: string;
  correlationId?: string;
  createdAt: string;
  expiresAt?: string;
  isPersistent: boolean; // True for CRITICAL until underlying condition resolves
}

export interface OverseerPresenceEnvelope {
  type: "overseer.presence";
  sequence: number;
  intent: OverseerIntent;
  affect: OverseerAffectState;
  attention?: AttentionTarget;
  faceParameters: FaceParameters;
  voiceState: VoiceState;
  effectLevel: VisualEffectLevel;
  thoughtSummary: string;
  sourceEvent?: string;
  correlationId?: string;
  timestamp: string;
}

export interface PresenceSnapshot {
  envelope: OverseerPresenceEnvelope;
  activeIntents: ActiveIntentRecord[];
  effectLevel: VisualEffectLevel;
  reducedMotion: boolean;
}
