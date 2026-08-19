/**
 * FactoryOS Frontier v2 — Overseer Blink & Ambient Idle Controller
 * Drives natural procedural blinking, micro-saccades, and breathing oscillations.
 */

export interface BlinkState {
  isBlinking: boolean;
  blinkAmount: number; // 0.0 to 1.0
  nextBlinkTime: number;
}

export interface AmbientOffset {
  gazeOffsetX: number;
  gazeOffsetY: number;
  scaleOffset: number;
  glowOffset: number;
}

export class OverseerBlinkController {
  private lastBlinkStartTime: number = Date.now();
  private nextBlinkIntervalMs: number = 3500;
  private blinkDurationMs: number = 150;
  private isBlinking: boolean = false;

  constructor() {
    this.scheduleNextBlink();
  }

  /**
   * Evaluates current blink amount [0.0, 1.0] at timestamp `now`.
   */
  update(now: number = Date.now()): number {
    const elapsedSinceScheduled = now - (this.lastBlinkStartTime + this.nextBlinkIntervalMs);

    if (elapsedSinceScheduled >= 0 && elapsedSinceScheduled < this.blinkDurationMs) {
      this.isBlinking = true;
      // Smooth bell curve for eyelid closure (0 -> 1 -> 0)
      const progress = elapsedSinceScheduled / this.blinkDurationMs;
      return Math.sin(progress * Math.PI);
    } else if (elapsedSinceScheduled >= this.blinkDurationMs) {
      if (this.isBlinking) {
        this.isBlinking = false;
        this.lastBlinkStartTime = now;
        this.scheduleNextBlink();
      }
      return 0.0;
    }

    return 0.0;
  }

  /**
   * Forces an immediate natural blink (e.g. on cognitive mode transition).
   */
  triggerBlink(now: number = Date.now()): void {
    this.lastBlinkStartTime = now - this.nextBlinkIntervalMs;
    this.isBlinking = true;
  }

  private scheduleNextBlink(): void {
    // Random interval between 2500ms and 5000ms
    this.nextBlinkIntervalMs = 2500 + Math.floor(Math.random() * 2500);
  }
}

export class OverseerIdleController {
  private blinkController = new OverseerBlinkController();
  private saccadeOffsetX: number = 0;
  private saccadeOffsetY: number = 0;
  private lastSaccadeTime: number = Date.now();
  private nextSaccadeIntervalMs: number = 4000;

  update(now: number = Date.now()): { blinkAmount: number; ambient: AmbientOffset } {
    const blinkAmount = this.blinkController.update(now);

    // Micro-saccades
    if (now - this.lastSaccadeTime > this.nextSaccadeIntervalMs) {
      this.lastSaccadeTime = now;
      this.nextSaccadeIntervalMs = 3000 + Math.random() * 4000;
      this.saccadeOffsetX = (Math.random() - 0.5) * 0.06;
      this.saccadeOffsetY = (Math.random() - 0.5) * 0.04;
    }

    // Breathing oscillation (0.4 Hz gentle sine wave)
    const timeSeconds = now / 1000;
    const breathingCycle = Math.sin(timeSeconds * 2 * Math.PI * 0.4);
    const scaleOffset = breathingCycle * 0.015;
    const glowOffset = breathingCycle * 0.05;

    return {
      blinkAmount,
      ambient: {
        gazeOffsetX: this.saccadeOffsetX,
        gazeOffsetY: this.saccadeOffsetY,
        scaleOffset,
        glowOffset,
      },
    };
  }

  triggerBlink(): void {
    this.blinkController.triggerBlink();
  }
}
