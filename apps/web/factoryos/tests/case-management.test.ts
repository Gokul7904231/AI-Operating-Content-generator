import { describe, it, expect, beforeEach } from "vitest";
import { CaseManager } from "../core/cases/CaseManager";
import { InMemoryCaseRepository } from "../core/database/InMemoryDatabase";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";

describe("FactoryOS v1 — Case Management Suite", () => {
  let repo: InMemoryCaseRepository;
  let eventBus: DurableEventBus;
  let worldState: WorldStateEngine;
  let manager: CaseManager;

  beforeEach(() => {
    repo = new InMemoryCaseRepository();
    eventBus = new DurableEventBus();
    worldState = new WorldStateEngine();
    manager = new CaseManager(repo, eventBus, worldState);
  });

  it("01: Creates a structured anomaly case with initial timeline entry", async () => {
    const created = await manager.createCase({
      title: "Audio synthesis buffer underrun",
      description: "Edge-TTS buffer underrun during Floor 03 narration synthesis",
      floorId: "floor03_asset_realization",
      category: "FLOOR_EXECUTION_ERROR",
      severity: "HIGH",
      detectorId: "slayer_compute",
      symptoms: ["Narration chunk timed out at 5000ms"],
      observedState: { bufferDepth: 0, pendingChunks: 3 },
    });

    expect(created.caseId).toMatch(/^case_/);
    expect(created.status).toBe("DETECTED");
    expect(created.severity).toBe("HIGH");
    expect(created.timeline.length).toBe(1);
    expect(created.timeline[0].action).toBe("CASE_CREATED");
    expect(worldState.getState().activeCaseIds).toContain(created.caseId);
  });

  it("02: Enforces valid status transitions and rejects illegal mutations", async () => {
    const created = await manager.createCase({
      title: "Script format anomaly",
      description: "Invalid JSON script payload",
      floorId: "floor02_scripting",
      category: "VALIDATION_REJECTION",
      severity: "MEDIUM",
      detectorId: "slayer_quality",
      symptoms: ["Missing required 'options' field"],
      observedState: {},
    });

    // Valid: DETECTED -> TRIAGED
    const triaged = await manager.transitionStatus(created.caseId, "TRIAGED", "Overseer", "Triaged by AI brain");
    expect(triaged.status).toBe("TRIAGED");

    // Illegal: TRIAGED -> RESOLVED directly without healing and verification
    await expect(
      manager.transitionStatus(created.caseId, "RESOLVED", "Overseer", "Illegal direct close")
    ).rejects.toThrow(/Invalid case transition/);
  });

  it("03: Deduplicates and links cascading anomalies on same floor and target", async () => {
    const primary = await manager.createCase({
      title: "GPU VRAM saturation",
      description: "GPU VRAM exceeded 95%",
      floorId: "floor03_asset_realization",
      targetWorker: "ffmpeg_encoder",
      category: "RESOURCE_EXHAUSTION",
      severity: "CRITICAL",
      detectorId: "slayer_compute",
      symptoms: ["VRAM at 98%"],
      observedState: { vramUsed: 8000 },
    });

    expect(primary.status).toBe("DETECTED");

    // Secondary anomaly on same floor and target
    const duplicate = await manager.createCase({
      title: "FFmpeg frame drop",
      description: "Frame render timeout caused by VRAM shortage",
      floorId: "floor03_asset_realization",
      targetWorker: "ffmpeg_encoder",
      category: "RESOURCE_EXHAUSTION",
      severity: "HIGH",
      detectorId: "slayer_rendering",
      symptoms: ["Frame drop on chunk 14"],
      observedState: { droppedFrames: 12 },
    });

    expect(duplicate.status).toBe("DUPLICATE");
    expect(duplicate.parentCaseId).toBe(primary.caseId);

    const reloadedPrimary = await manager.getCase(primary.caseId);
    expect(reloadedPrimary?.linkedCaseIds).toContain(duplicate.caseId);
  });

  it("04: Aggregates evidence and hypotheses into the case record", async () => {
    const caseItem = await manager.createCase({
      title: "Network socket drop",
      description: "Drive adapter socket reset",
      floorId: "floor03_asset_realization",
      category: "NETWORK_TIMEOUT",
      severity: "MEDIUM",
      detectorId: "slayer_general_patrol",
      symptoms: ["HTTP 503 from endpoint"],
      observedState: {},
    });

    await manager.addEvidence(
      caseItem.caseId,
      {
        evidenceId: "ev_001",
        type: "LOG",
        source: "slayer_general_patrol",
        description: "Socket connection timeout log trace",
        data: { port: 443, latency: 10000 },
        collectedAt: new Date().toISOString(),
        confidence: 0.95,
      },
      "slayer_general_patrol"
    );

    await manager.addHypothesis(
      caseItem.caseId,
      {
        hypothesisId: "hyp_001",
        theory: "Transient network timeout due to upstream throttling",
        likelihood: 0.9,
        verified: false,
        rationale: "Socket RST received after 10s wait",
        supportingEvidenceIds: ["ev_001"],
      },
      "slayer_general_patrol"
    );

    const reloaded = await manager.getCase(caseItem.caseId);
    expect(reloaded?.evidence.length).toBe(1);
    expect(reloaded?.hypotheses.length).toBe(1);
    expect(reloaded?.hypotheses[0].theory).toContain("Transient network timeout");
  });
});
