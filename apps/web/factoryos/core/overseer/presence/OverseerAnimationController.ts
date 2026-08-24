/**
 * FactoryOS Frontier v2 — Overseer Animation & Spring Interpolation Controller
 * Performs smooth spring/damping geometry transitions to prevent abrupt visual jumps.
 */

import type { FaceParameters, EyeParameters } from "./OverseerPresenceContracts";

export class OverseerAnimationController {
  private currentParams: FaceParameters;
  private stiffness: number = 0.18; // Spring stiffness
  private damping: number = 0.82;   // Spring damping

  constructor(initialParams: FaceParameters) {
    this.currentParams = structuredClone(initialParams);
  }

  getCurrent(): FaceParameters {
    return structuredClone(this.currentParams);
  }

  /**
   * Interpolates current parameters toward target parameters.
   * `dtFactor`: frame time scaling (1.0 for 60fps).
   */
  stepToward(target: FaceParameters, dtFactor: number = 1.0): FaceParameters {
    const lerp = (curr: number, tgt: number, speed: number) =>
      curr + (tgt - curr) * Math.min(1.0, speed * dtFactor);

    // 1. Eye parameters interpolation
    const eye: EyeParameters = {
      openness: lerp(this.currentParams.eye.openness, target.eye.openness, 0.22),
      width: lerp(this.currentParams.eye.width, target.eye.width, 0.18),
      height: lerp(this.currentParams.eye.height, target.eye.height, 0.18),
      pupilScale: lerp(this.currentParams.eye.pupilScale, target.eye.pupilScale, 0.2),
      gazeX: lerp(this.currentParams.eye.gazeX, target.eye.gazeX, 0.25),
      gazeY: lerp(this.currentParams.eye.gazeY, target.eye.gazeY, 0.25),
      eyebrowAngle: lerp(this.currentParams.eye.eyebrowAngle, target.eye.eyebrowAngle, 0.16),
      blinkAmount: target.eye.blinkAmount, // Blink is directly driven by procedural curve
      softness: lerp(this.currentParams.eye.softness, target.eye.softness, 0.15),
    };

    // 2. Face parameters interpolation
    this.currentParams = {
      eye,
      mouthCurve: lerp(this.currentParams.mouthCurve, target.mouthCurve, 0.18),
      mouthOpenness: lerp(this.currentParams.mouthOpenness, target.mouthOpenness, 0.35),
      headTilt: lerp(this.currentParams.headTilt, target.headTilt, 0.12),
      faceScale: lerp(this.currentParams.faceScale, target.faceScale, 0.15),
      glowIntensity: lerp(this.currentParams.glowIntensity, target.glowIntensity, 0.2),
      accentColor: target.accentColor,
      pulseFrequency: lerp(this.currentParams.pulseFrequency, target.pulseFrequency, 0.15),
    };

    return structuredClone(this.currentParams);
  }
}
