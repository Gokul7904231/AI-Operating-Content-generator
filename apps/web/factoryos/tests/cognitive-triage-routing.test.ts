import { describe, it, expect } from "vitest";
import { CognitiveTriageEngine } from "../core/cognitive/CognitiveTriageEngine";

describe("FactoryOS Frontier v2 — Phase 5: Cognitive Triage & Adaptive Routing Suite", () => {
  const triage = new CognitiveTriageEngine();

  it("1. Deterministic Routing: Standard routine operational anomaly routes to DETERMINISTIC", () => {
    const level = triage.triageIncident({
      incidentId: "inc_01",
      category: "WORKER_STALL",
      severity: "LOW",
      symptoms: ["Heartbeat delay 5s"],
      observedMetrics: {},
    });
    expect(level).toBe("DETERMINISTIC");
  });

  it("2. Fast Routing: Multi-symptom low-severity anomaly routes to FAST", () => {
    const level = triage.triageIncident({
      incidentId: "inc_02",
      category: "PIPELINE_STALL",
      severity: "LOW",
      symptoms: ["Queue backlog 5", "Worker latency 45ms"],
      observedMetrics: {},
    });
    expect(level).toBe("FAST");
  });

  it("3. Deliberate Routing: High-severity or high-risk candidate actions route to DELIBERATE", () => {
    const level = triage.triageIncident({
      incidentId: "inc_03",
      category: "GPU_SATURATION",
      severity: "HIGH",
      symptoms: ["VRAM pressure 95%"],
      observedMetrics: {},
      candidateActions: [
        { actionId: "drain_vram", title: "Drain and flush all VRAM buffers", riskLevel: "HIGH" },
      ],
    });
    expect(level).toBe("DELIBERATE");
  });

  it("4. RLM Routing: Large log corpus (>3000 chars) routes to RLM", () => {
    const level = triage.triageIncident({
      incidentId: "inc_04",
      category: "UNKNOWN_DRIFT",
      severity: "MEDIUM",
      symptoms: ["Unexplained latency drift across pipeline"],
      observedMetrics: {},
      rawLogs: ["A".repeat(1500), "B".repeat(1600)],
    });
    expect(level).toBe("RLM");
  });

  it("5. Multi-Agent Routing: Conflicting claims between agents routes to MULTI_AGENT", () => {
    const level = triage.triageIncident({
      incidentId: "inc_05",
      category: "STORAGE_VS_GPU",
      severity: "HIGH",
      symptoms: ["Floor 03 render failure"],
      observedMetrics: {},
      conflictingClaims: [
        { agentId: "guardian_f03", claim: "Storage subsystem out of inodes" },
        { agentId: "slayer_compute", claim: "GPU VRAM hardware fault" },
      ],
    });
    expect(level).toBe("MULTI_AGENT");
  });
});
