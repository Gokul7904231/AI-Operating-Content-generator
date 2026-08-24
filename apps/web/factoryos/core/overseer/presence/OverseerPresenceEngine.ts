/**
 * FactoryOS Frontier v2 — Overseer Presence Engine
 * Master real-time presence coordinator connecting FactoryOS cognition, events, affect,
 * attention, voice, and procedural face rendering into a unified living AI presence.
 */

import { randomUUID } from "node:crypto";
import type {
  OverseerIntent,
  OverseerAffectState,
  AttentionTarget,
  FaceParameters,
  VoiceState,
  VisualEffectLevel,
  OverseerPresenceEnvelope,
  PresenceSnapshot,
  ActiveIntentRecord,
} from "./OverseerPresenceContracts";
import { OverseerAffectEngine } from "./OverseerAffectEngine";
import { OverseerIntentEngine } from "./OverseerIntentEngine";
import { OverseerAttentionController } from "./OverseerAttentionController";
import { OverseerExpressionEngine } from "./OverseerExpressionEngine";
import { OverseerIdleController } from "./OverseerIdleController";
import { OverseerEffectController } from "./OverseerEffectController";
import { OverseerVoiceController } from "./OverseerVoiceController";
import { OverseerPresencePolicy } from "./OverseerPresencePolicy";
import type { DurableEventBus } from "../../events/DurableEventBus";
import type { WorldStateEngine } from "../../worldstate/WorldStateEngine";
import type { CaseManager } from "../../cases/CaseManager";
import type { MissionManager } from "../../missions/MissionManager";

export interface PresenceEngineConfig {
  reducedMotion?: boolean;
  effectLevel?: VisualEffectLevel;
  broadcastIntervalMs?: number;
}

export class OverseerPresenceEngine {
  private eventBus: DurableEventBus;
  private worldState: WorldStateEngine;
  private caseManager?: CaseManager;
  private missionManager?: MissionManager;

  public readonly affectEngine: OverseerAffectEngine;
  public readonly intentEngine: OverseerIntentEngine;
  public readonly attentionController: OverseerAttentionController;
  public readonly expressionEngine: OverseerExpressionEngine;
  public readonly idleController: OverseerIdleController;
  public readonly effectController: OverseerEffectController;
  public readonly voiceController: OverseerVoiceController;

  private sequenceNumber: number = 0;
  private eventHistory: OverseerPresenceEnvelope[] = [];
  private currentThoughtSummary: string = "FactoryOS operational. All systems nominal.";
  private broadcastTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(
    eventBus: DurableEventBus,
    worldState: WorldStateEngine,
    caseManager?: CaseManager,
    missionManager?: MissionManager,
    config: PresenceEngineConfig = {}
  ) {
    this.eventBus = eventBus;
    this.worldState = worldState;
    this.caseManager = caseManager;
    this.missionManager = missionManager;

    this.affectEngine = new OverseerAffectEngine();
    this.intentEngine = new OverseerIntentEngine();
    this.attentionController = new OverseerAttentionController();
    this.expressionEngine = new OverseerExpressionEngine();
    this.idleController = new OverseerIdleController();
    this.effectController = new OverseerEffectController({
      effectLevel: config.effectLevel ?? 3,
      prefersReducedMotion: config.reducedMotion ?? false,
    });
    this.voiceController = new OverseerVoiceController();

    this.subscribeToFactoryEvents();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initial projection from current WorldState
    await this.reconstructFromOperationalState();

    // Broadcast presence ticks periodically
    this.broadcastTimer = setInterval(() => {
      this.publishPresenceTick().catch(() => {});
    }, 1000);

    await this.publishPresenceTick();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }
  }

  /**
   * Reconstructs initial or post-restart presence state from authoritative operational facts.
   */
  async reconstructFromOperationalState(): Promise<OverseerPresenceEnvelope> {
    const currentState = this.worldState.getState();
    const activeCases = this.caseManager ? await this.caseManager.getActiveCases() : [];
    const activeMissions = this.missionManager ? await this.missionManager.getActiveMissions() : [];

    const criticalCase = activeCases.find((c) => c.severity === "CRITICAL" && c.status !== "RESOLVED");
    const highCase = activeCases.find((c) => c.severity === "HIGH" && c.status !== "RESOLVED");

    if (criticalCase || currentState.factoryStatus === "HALTED") {
      this.intentEngine.pushIntent("CRITICAL", {
        priority: "CRITICAL_SAFETY",
        cause: criticalCase ? `Critical incident: ${criticalCase.title}` : "Factory in HALTED state",
        isPersistent: true,
      });
      this.currentThoughtSummary = criticalCase ? `CRITICAL ALERT: ${criticalCase.description}` : "Critical factory anomaly detected.";
      if (criticalCase?.floorId) {
        this.attentionController.setAttention(
          criticalCase.floorId as any,
          `Investigating critical case ${criticalCase.caseId}`,
          "CRITICAL"
        );
      }
    } else if (highCase || currentState.factoryStatus === "DEGRADED") {
      this.intentEngine.pushIntent("CONCERNED", {
        priority: "ACTIVE_INCIDENT",
        cause: highCase ? `High severity case: ${highCase.title}` : "Factory DEGRADED",
        isPersistent: true,
      });
      this.currentThoughtSummary = highCase ? `Investigating anomaly on ${highCase.floorId}` : "Floor performance degraded.";
      if (highCase?.floorId) {
        this.attentionController.setAttention(
          highCase.floorId as any,
          `Observing degraded floor ${highCase.floorId}`,
          "HIGH"
        );
      }
    } else if (activeMissions.length > 0) {
      this.intentEngine.pushIntent("OBSERVING", {
        priority: "HIGH_MISSION",
        cause: `Supervising active mission ${activeMissions[0].missionId}`,
        isPersistent: true,
      });
      this.currentThoughtSummary = `Supervising active mission: "${activeMissions[0].objective}"`;
    } else {
      this.intentEngine.pushIntent("IDLE", {
        priority: "IDLE",
        cause: "Factory healthy, monitoring readiness",
        isPersistent: true,
      });
      this.currentThoughtSummary = "Factory operational. All floors healthy.";
    }

    this.affectEngine.evaluateAppraisal({
      worldState: currentState,
      activeCases,
    });

    return this.generateCurrentEnvelope();
  }

  /**
   * Generates the current structured OverseerPresenceEnvelope.
   */
  generateCurrentEnvelope(options: { sourceEvent?: string; correlationId?: string } = {}): OverseerPresenceEnvelope {
    const currentState = this.worldState ? this.worldState.getState() : undefined;
    const activeCases = this.caseManager ? [] : []; // Synchronous fast path

    // 1. Resolve Effective Intent through Truth Gate
    const effectiveIntent = this.intentEngine.resolveEffectiveIntent({
      affect: this.affectEngine.getAffect(),
      worldState: currentState,
    });

    // 2. Ambient Behavior (Blink & Micro-motion)
    const { blinkAmount, ambient } = this.idleController.update();

    // 3. Attention Target
    const attention = this.attentionController.getCurrentAttention();
    // Add ambient saccade offset to gaze
    attention.gazeX = Math.max(-1.0, Math.min(1.0, attention.gazeX + ambient.gazeOffsetX));
    attention.gazeY = Math.max(-1.0, Math.min(1.0, attention.gazeY + ambient.gazeOffsetY));

    // 4. Resolve Expression Parameters
    const faceParameters = this.expressionEngine.resolveFaceParameters({
      intent: effectiveIntent,
      affect: this.affectEngine.getAffect(),
      attention,
      voiceState: this.voiceController.getVoiceState(),
      blinkAmount,
    });

    // Modulate subtle breathing scale & glow
    faceParameters.faceScale = Math.max(0.9, Math.min(1.1, faceParameters.faceScale + ambient.scaleOffset));
    faceParameters.glowIntensity = Math.max(0.1, Math.min(1.0, faceParameters.glowIntensity + ambient.glowOffset));

    // 5. Visual Effect Level
    const effectLevel = this.effectController.getEffectiveLevel(effectiveIntent);

    this.sequenceNumber += 1;
    const envelope: OverseerPresenceEnvelope = {
      type: "overseer.presence",
      sequence: this.sequenceNumber,
      intent: effectiveIntent,
      affect: this.affectEngine.getAffect(),
      attention,
      faceParameters,
      voiceState: this.voiceController.getVoiceState(),
      effectLevel,
      thoughtSummary: this.currentThoughtSummary,
      sourceEvent: options.sourceEvent,
      correlationId: options.correlationId,
      timestamp: new Date().toISOString(),
    };

    // Store in ring buffer for SSE reconnect replay (last 100 events)
    this.eventHistory.push(envelope);
    if (this.eventHistory.length > 100) {
      this.eventHistory.shift();
    }

    return envelope;
  }

  /**
   * Publishes the presence envelope to the DurableEventBus for SSE and UI consumers.
   */
  async publishPresenceTick(sourceEvent?: string, correlationId?: string): Promise<OverseerPresenceEnvelope> {
    const envelope = this.generateCurrentEnvelope({ sourceEvent, correlationId });

    await this.eventBus.publish("OVERSEER_PRESENCE_STATE", envelope as any, {
      correlationId: correlationId || `pres_${randomUUID().substring(0, 8)}`,
      source: "overseer_presence_engine",
    });

    return envelope;
  }

  /**
   * Returns snapshot with event replay for browser reconnection.
   */
  getSnapshot(lastEventSequence?: number): {
    current: OverseerPresenceEnvelope;
    replay: OverseerPresenceEnvelope[];
  } {
    const current = this.generateCurrentEnvelope();
    let replay: OverseerPresenceEnvelope[] = [];
    if (lastEventSequence !== undefined && lastEventSequence > 0) {
      replay = this.eventHistory.filter((e) => e.sequence > lastEventSequence);
    }
    return { current, replay };
  }

  /**
   * Subscribes to real FactoryOS durable events.
   */
  private subscribeToFactoryEvents(): void {
    if (!this.eventBus) return;
    // 1. Anomaly & Incident Detection
    this.eventBus.subscribe("ANOMALY_DETECTED", async (event: any) => {
      const payload = event?.payload || event;
      const severity = payload?.severity || "MEDIUM";
      const isCritical = severity === "CRITICAL";

      this.affectEngine.evaluateAppraisal({
        eventType: "ANOMALY_DETECTED",
        severity,
        worldState: this.worldState.getState(),
      });

      this.intentEngine.pushIntent(isCritical ? "CRITICAL" : "CONCERNED", {
        priority: isCritical ? "CRITICAL_SAFETY" : "ACTIVE_INCIDENT",
        cause: payload?.description || "Anomaly detected by Slayer",
        sourceEvent: "ANOMALY_DETECTED",
        correlationId: event?.correlationId,
        isPersistent: isCritical,
      });

      if (payload?.floorId) {
        this.attentionController.setAttention(
          payload.floorId,
          `Investigating anomaly on ${payload.floorId}`,
          isCritical ? "CRITICAL" : "HIGH"
        );
      }

      this.currentThoughtSummary = `Anomaly detected on ${payload?.floorId || "factory"}: ${payload?.description || "investigating"}`;
      this.idleController.triggerBlink();
      await this.publishPresenceTick("ANOMALY_DETECTED", event?.correlationId);
    });

    // 2. Case Created
    this.eventBus.subscribe("CASE_CREATED", async (event: any) => {
      const payload = event?.payload || event;
      const isCritical = payload?.severity === "CRITICAL" || payload?.caseItem?.severity === "CRITICAL";

      this.intentEngine.pushIntent(isCritical ? "CRITICAL" : "CONCERNED", {
        priority: isCritical ? "CRITICAL_SAFETY" : "ACTIVE_INCIDENT",
        cause: `Case filed: ${payload?.caseId || payload?.title}`,
        sourceEvent: "CASE_CREATED",
        correlationId: event?.correlationId,
        isPersistent: isCritical,
      });

      this.currentThoughtSummary = `Case opened: ${payload?.title || payload?.caseId}. Triaging root cause.`;
      await this.publishPresenceTick("CASE_CREATED", event?.correlationId);
    });

    // 3. Healer Dispatched & Repair Started
    this.eventBus.subscribe("HEALER_DISPATCHED", async (event: any) => {
      this.intentEngine.clearIntent("CRITICAL");
      this.intentEngine.clearIntent("WARNING");

      this.intentEngine.pushIntent("RECOVERING", {
        priority: "ACTIVE_INCIDENT",
        durationMs: 4500,
        cause: "Healers executing targeted repair",
        sourceEvent: "HEALER_DISPATCHED",
        correlationId: event?.correlationId,
      });

      this.currentThoughtSummary = "Healers dispatched. Restoring operational stability.";
      await this.publishPresenceTick("HEALER_DISPATCHED", event?.correlationId);
    });

    // 4. Case Resolved & Validation Passed
    this.eventBus.subscribe("CASE_RESOLVED", async (event: any) => {
      const payload = event?.payload || event;
      this.intentEngine.clearIntent("CRITICAL");
      this.intentEngine.clearIntent("WARNING");
      this.intentEngine.clearIntent("RECOVERING");

      this.affectEngine.evaluateAppraisal({
        eventType: "CASE_RESOLVED",
        worldState: this.worldState.getState(),
      });

      this.intentEngine.pushIntent("SUCCESS", {
        priority: "HIGH_MISSION",
        durationMs: 2500,
        cause: `Case ${payload?.caseId || ""} resolved and validated`,
        sourceEvent: "CASE_RESOLVED",
        correlationId: event?.correlationId,
      });

      this.currentThoughtSummary = `Case ${payload?.caseId || ""} resolved. System restored to healthy.`;
      this.attentionController.resetToUser();
      await this.publishPresenceTick("CASE_RESOLVED", event?.correlationId);
    });

    // 5. Mission Lifecycle
    this.eventBus.subscribe("MISSION_STARTED", async (event: any) => {
      const payload = event?.payload || event;
      this.intentEngine.pushIntent("THINKING", {
        priority: "HIGH_MISSION",
        durationMs: 2000,
        cause: `Mission started: ${payload?.goal || ""}`,
        sourceEvent: "MISSION_STARTED",
        correlationId: event?.correlationId,
      });

      this.currentThoughtSummary = `Executing mission: "${payload?.goal || "autonomous mission"}"`;
      await this.publishPresenceTick("MISSION_STARTED", event?.correlationId);
    });

    this.eventBus.subscribe("MISSION_COMPLETED", async (event: any) => {
      this.affectEngine.evaluateAppraisal({
        eventType: "MISSION_COMPLETED",
        missionStatus: "COMPLETED",
        worldState: this.worldState.getState(),
      });

      this.intentEngine.pushIntent("SUCCESS", {
        priority: "HIGH_MISSION",
        durationMs: 3000,
        cause: "Mission successfully completed",
        sourceEvent: "MISSION_COMPLETED",
        correlationId: event?.correlationId,
      });

      this.currentThoughtSummary = "Mission completed successfully. Objective achieved.";
      this.attentionController.resetToUser();
      await this.publishPresenceTick("MISSION_COMPLETED", event?.correlationId);
    });

    // 6. User Interaction / Voice
    this.eventBus.subscribe("USER_MESSAGE", async (event: any) => {
      this.intentEngine.pushIntent("LISTENING", {
        priority: "USER_INTERACTION",
        durationMs: 3000,
        cause: "User interacting with Overseer",
        sourceEvent: "USER_MESSAGE",
        correlationId: event?.correlationId,
      });

      this.voiceController.startListening();
      this.attentionController.setAttention("user", "Listening to user command", "NORMAL");
      await this.publishPresenceTick("USER_MESSAGE", event?.correlationId);
    });
  }
}
