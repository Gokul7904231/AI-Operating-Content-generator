/**
 * FactoryOS Frontier v2 — Overseer Expression Engine
 * Resolves deterministic parameterized face geometry from intent, affect, attention, voice state, and blink amount.
 */

import type {
  FaceParameters,
  OverseerAffectState,
  OverseerIntent,
  AttentionTarget,
  VoiceState,
} from "./OverseerPresenceContracts";
import { OVERSEER_EXPRESSION_PRESETS } from "./OverseerExpressionPresets";

export interface ResolveExpressionParams {
  intent: OverseerIntent;
  affect: OverseerAffectState;
  attention?: AttentionTarget;
  voiceState?: VoiceState;
  blinkAmount?: number;
}

export class OverseerExpressionEngine {
  /**
   * Resolves final face parameters deterministically.
   */
  resolveFaceParameters(params: ResolveExpressionParams): FaceParameters {
    const { intent, affect, attention, voiceState, blinkAmount = 0.0 } = params;

    const basePreset = OVERSEER_EXPRESSION_PRESETS[intent] || OVERSEER_EXPRESSION_PRESETS.IDLE;
    const face: FaceParameters = structuredClone(basePreset);

    // 1. Modulate Gaze from Attention Target
    if (attention) {
      face.eye.gazeX = this.clamp(attention.gazeX, -1.0, 1.0);
      face.eye.gazeY = this.clamp(attention.gazeY, -1.0, 1.0);
    }

    // 2. Modulate Eyebrows & Eye Softness from Affect (Concern & Uncertainty)
    if (affect.concern > 0.3) {
      face.eye.eyebrowAngle = Math.min(face.eye.eyebrowAngle, -5 - affect.concern * 10);
    }
    if (affect.curiosity > 0.5 && intent === "CURIOUS") {
      face.eye.eyebrowAngle = 5 + affect.curiosity * 5;
      face.eye.pupilScale = Math.min(1.4, face.eye.pupilScale + 0.15);
    }

    // 3. Modulate Pupil Scale by Arousal & Uncertainty
    if (affect.arousal > 0.7) {
      face.eye.pupilScale = Math.max(0.65, face.eye.pupilScale - (affect.arousal - 0.7) * 0.5);
    }

    // 4. Modulate Glow by Arousal & Urgency
    const dynamicGlow = face.glowIntensity + affect.urgency * 0.15 + affect.arousal * 0.1;
    face.glowIntensity = this.clamp(dynamicGlow, 0.1, 1.0);

    // 5. Apply Blink Controller
    face.eye.blinkAmount = this.clamp(blinkAmount, 0.0, 1.0);
    if (blinkAmount > 0.0) {
      face.eye.openness = face.eye.openness * (1.0 - blinkAmount);
    }

    // 6. Modulate Mouth by Voice State
    if (voiceState === "SPEAKING") {
      face.mouthOpenness = Math.max(0.25, face.mouthOpenness + 0.35);
      face.mouthCurve = Math.max(-0.2, face.mouthCurve);
    } else if (voiceState === "LISTENING") {
      face.mouthOpenness = 0.08;
    } else {
      face.mouthOpenness = 0.0;
    }

    return face;
  }

  private clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }
}
