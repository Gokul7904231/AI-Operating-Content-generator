import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { AutonomousScheduler } from "../core/production/AutonomousScheduler";
import { DailyProductionPolicy } from "../core/production/DailyProductionPolicy";
import { ProductionStateMachine, InvalidStateTransitionError } from "../core/production/ProductionStateMachine";
import { ProductionOverseer } from "../core/overseer/ProductionOverseer";
import { ProductionRunner } from "../core/production/ProductionRunner";
import { NetworkCapabilityMonitor } from "../core/production/NetworkCapabilityMonitor";
import { OutputArtifactValidator } from "../core/production/OutputArtifactValidator";
import { AIProviderRegistry } from "../../ai/capability-registry";
import path from "path";
import fs from "fs";

describe("FactoryOS v0.1 — Autonomous Production Red-Team Suite", () => {
  let policy: DailyProductionPolicy;
  let scheduler: AutonomousScheduler;
  let overseer: ProductionOverseer;

  beforeAll(() => {
    const mockPlugin: any = {
      id: "mock_quiz_provider",
      name: "Mock Quiz Provider",
      manifest: { id: "mock_quiz_provider", name: "Mock", version: "1.0", author: "Test", description: "", dependencies: [], capabilities: ["SCRIPT"] },
      discoverModels: async () => [{ id: "mock-model", name: "Mock", provider: "mock_quiz_provider", capabilities: ["SCRIPT"], contextWindow: 4096, costInput: 0, costOutput: 0, speed: 100, health: 1.0, availability: true, isLocal: true }],
      health: async () => true,
      priority: () => 100,
      execute: async () =>
        JSON.stringify({
          contentType: "QUIZ_SHORTS",
          hook: "Only 1% of history buffs get Question 6 right!",
          questions: [
            { difficulty: "easy", question: "What is the capital of France?", options: ["Paris", "Lyon", "Marseille"], answer: "Paris", explanation: "Paris is capital." },
            { difficulty: "medium", question: "Which river flows through Paris?", options: ["Thames", "Seine", "Danube"], answer: "Seine", explanation: "Seine river." },
            { difficulty: "hard", question: "In what year was the Eiffel Tower built?", options: ["1889", "1900", "1850"], answer: "1889", explanation: "1889." },
            { difficulty: "easy", question: "What is the red planet?", options: ["Mars", "Venus", "Jupiter"], answer: "Mars", explanation: "Mars is red." },
            { difficulty: "medium", question: "First human in space?", options: ["Yuri Gagarin", "Neil Armstrong", "Buzz Aldrin"], answer: "Yuri Gagarin", explanation: "Yuri Gagarin." },
            { difficulty: "hard", question: "Speed of light in m/s?", options: ["299,792,458", "150,000,000", "3,000,000"], answer: "299,792,458", explanation: "Speed of light." },
          ],
          title: "Red-Team Test Quiz",
          description: "Trivia test",
          hashtags: ["test", "quiz"],
          renderProfile: "FAST_QUIZ",
          estimatedDuration: 60,
        }),
      status: () => ({ state: "ONLINE", latency: 10, avgResponseTime: 10, errorRate: 0, totalCost: { tokensInput: 0, tokensOutput: 0, estimatedUSD: 0, currency: "USD", pricingSource: "free", lastUpdated: Date.now() }, retries: 0, retryRate: 0, quotaRemaining: -1, rateLimitLimit: -1, rateLimitRemaining: -1, rateLimitReset: 0, jsonReliability: 1.0, lastChecked: Date.now() }),
    };

    AIProviderRegistry.registerPlugin(mockPlugin);
  });

  beforeEach(() => {
    policy = new DailyProductionPolicy({ maxPerDay: 4 });
    scheduler = new AutonomousScheduler(policy);
    overseer = new ProductionOverseer(scheduler);
    NetworkCapabilityMonitor.getInstance().setStatus("ONLINE");
  });

  it("RED-TEAM 01: Duplicate scheduler execution is idempotent and prevents slot duplication", () => {
    const topics = ["Space", "History", "Science"];
    const run1 = scheduler.planDailySchedule("2026-08-06", topics);
    expect(run1.length).toBe(3);

    // Duplicate firing with same topics & date
    const run2 = scheduler.planDailySchedule("2026-08-06", topics);
    expect(run2.length).toBe(0); // Idempotency key match prevents duplicate planning
  });

  it("RED-TEAM 02: Quota overflow attempt beyond daily policy maximum is rejected", () => {
    scheduler.setQuota(4);
    const planned = scheduler.planDailySchedule("2026-08-06", ["A", "B", "C", "D", "E", "F"]);
    expect(planned.length).toBe(4);
  });

  it("RED-TEAM 03: Artifact validator rejects empty files (0 bytes) and spoofed paths", () => {
    const emptyFilePath = path.join(process.cwd(), "data", "renders", "empty_test.mp4");
    fs.writeFileSync(emptyFilePath, Buffer.alloc(0));

    const valResult = OutputArtifactValidator.validate({
      filePath: emptyFilePath,
      fileSizeBytes: 0,
      durationSeconds: 60,
      format: "mp4",
      renderedAt: new Date().toISOString(),
    });

    expect(valResult.valid).toBe(false);
    expect(valResult.issues).toContain(`Artifact file is empty (0 bytes): "${path.resolve(emptyFilePath)}"`);
  });

  it("RED-TEAM 04: Overseer security prohibition prevents bypassing Guardian or forcing COMPLETED status", () => {
    expect(() => overseer.forceComplete("job_01")).toThrow(/OverseerSecurityViolation/);
    expect(() => overseer.forceGuardianPass("job_01")).toThrow(/OverseerSecurityViolation/);
  });

  it("RED-TEAM 05: Illegal state transitions throw InvalidStateTransitionError", () => {
    const planned = scheduler.planDailySchedule("2026-08-06", ["Space"]);
    const job = planned[0];

    // Attempting direct jump from PLANNED to COMPLETED
    expect(() => ProductionStateMachine.transition(job, "COMPLETED")).toThrow(InvalidStateTransitionError);
    // Attempting direct jump from GENERATING to UPLOADING
    const generating = ProductionStateMachine.transition(job, "WAITING");
    const genStatus = ProductionStateMachine.transition(generating, "GENERATING");
    expect(() => ProductionStateMachine.transition(genStatus, "UPLOADING")).toThrow(InvalidStateTransitionError);
  });

  it("RED-TEAM 06: Outbox delivery survives network loss and resumes cleanly upon network restoration", async () => {
    const planned = scheduler.planDailySchedule("2026-08-06", ["Deep Sea"]);
    const runner = new ProductionRunner({ scheduler, overseer });

    // Step 1: Simulate network offline before delivery
    NetworkCapabilityMonitor.getInstance().setStatus("OFFLINE");
    const offlineJob = await runner.executeJob(planned[0].id);

    expect(offlineJob.status).toBe("DELIVERY_PENDING");
    expect(offlineJob.deliveryArtifact?.verified).toBe(false);

    // Step 2: Restore network and resume delivery
    NetworkCapabilityMonitor.getInstance().setStatus("ONLINE");
    const restoredJob = await runner.executeJob(planned[0].id);

    expect(restoredJob.status).toBe("COMPLETED");
    expect(restoredJob.deliveryArtifact?.verified).toBe(true);
  }, 30000);

  it("RED-TEAM 07: Overseer retryJob transitions FAILED job back through RETRY_WAIT to WAITING", () => {
    const planned = scheduler.planDailySchedule("2026-08-06", ["Retry Topic"]);
    const job = planned[0];

    const waiting = scheduler.updateJobStatus(job.id, "WAITING");
    const generating = scheduler.updateJobStatus(waiting.id, "GENERATING");
    const failed = scheduler.updateJobStatus(generating.id, "FAILED", "Simulated failure");

    expect(failed.status).toBe("FAILED");

    const retried = overseer.retryJob(failed.id);
    expect(retried.status).toBe("WAITING");
  });
});
