import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { AutonomousScheduler } from "../core/production/AutonomousScheduler";
import { DailyProductionPolicy } from "../core/production/DailyProductionPolicy";
import { ProductionStateMachine, InvalidStateTransitionError } from "../core/production/ProductionStateMachine";
import { ProductionOverseer } from "../core/overseer/ProductionOverseer";
import { ProductionRunner } from "../core/production/ProductionRunner";
import { NetworkCapabilityMonitor } from "../core/production/NetworkCapabilityMonitor";
import { ProductionJob } from "../core/production/ProductionJob";
import { AIProviderRegistry } from "../../ai/capability-registry";

describe("FactoryOS v0.1 — Autonomous Production Architecture", () => {
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
          title: "Production Test Quiz",
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

  it("01: ProductionStateMachine validates allowed transitions and rejects illegal mutations", () => {
    const job: ProductionJob = {
      id: "job_test_01",
      scheduleId: "sched_01",
      requestedDate: "2026-08-06",
      plannedSlot: 1,
      topic: "Space",
      status: "PLANNED",
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      idempotencyKey: "idem_01",
    };

    // Valid: PLANNED -> WAITING -> GENERATING
    let updated = ProductionStateMachine.transition(job, "WAITING");
    expect(updated.status).toBe("WAITING");

    updated = ProductionStateMachine.transition(updated, "GENERATING");
    expect(updated.status).toBe("GENERATING");

    // Illegal: GENERATING directly to COMPLETED (bypassing validation & rendering)
    expect(() => ProductionStateMachine.transition(updated, "COMPLETED")).toThrow(InvalidStateTransitionError);
  });

  it("02: AutonomousScheduler enforces daily production policy (max/day quota)", () => {
    scheduler.setQuota(4);
    const topics = ["Space", "History", "Science", "Geography", "Technology", "Art"];
    const planned = scheduler.planDailySchedule("2026-08-06", topics);

    expect(planned.length).toBe(4); // Capped at maxPerDay = 4

    // Start 4 jobs to hit quota
    for (const job of planned) {
      scheduler.updateJobStatus(job.id, "WAITING");
      scheduler.updateJobStatus(job.id, "GENERATING");
    }

    // Attempting to plan 5th job beyond quota is blocked
    const extraJob: ProductionJob = {
      id: "job_extra_05",
      scheduleId: "sched_05",
      requestedDate: "2026-08-06",
      plannedSlot: 5,
      topic: "Extra",
      status: "PLANNED",
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      idempotencyKey: "idem_05",
    };
    scheduler.updateJob(extraJob);

    const result = scheduler.updateJobStatus("job_extra_05", "GENERATING");
    expect(result.status).toBe("BLOCKED");
  });

  it("03: Overseer snapshot answers past, current, and future production state", () => {
    scheduler.setQuota(5);
    scheduler.planDailySchedule("2026-08-06", ["Space Exploration", "World War II"]);

    const snapshot = overseer.getSnapshot("2026-08-06");

    expect(snapshot.date).toBe("2026-08-06");
    expect(snapshot.dailyPolicy.maxPerDay).toBe(5);
    expect(snapshot.dailyPolicy.planned).toBe(2);
    expect(snapshot.systemStatus.guardian).toBe("HEALTHY");
  });

  it("04: Overseer authority constraints prohibit force-complete and force-guardian-pass", () => {
    expect(() => overseer.forceComplete("job_01")).toThrow(/OverseerSecurityViolation/);
    expect(() => overseer.forceGuardianPass("job_01")).toThrow(/OverseerSecurityViolation/);
  });

  it("05: ProductionRunner executes end-to-end production job cleanly", async () => {
    const planned = scheduler.planDailySchedule("2026-08-06", ["French Revolution"]);
    const runner = new ProductionRunner({ scheduler, overseer });

    const completedJob = await runner.executeJob(planned[0].id);

    expect(completedJob.status).toBe("COMPLETED");
    expect(completedJob.quizArtifact).toBeDefined();
    expect(completedJob.guardianReport?.decision).toBe("PASS");
    expect(completedJob.videoArtifact?.filePath).toBeDefined();
    expect(completedJob.deliveryArtifact?.verified).toBe(true);
  }, 30000);

  it("06: Network offline transition retains job in DELIVERY_PENDING outbox without crashing local pipeline", async () => {
    const planned = scheduler.planDailySchedule("2026-08-06", ["Ocean Deep"]);
    const runner = new ProductionRunner({ scheduler, overseer });

    // Set network status to OFFLINE right before delivery step
    NetworkCapabilityMonitor.getInstance().setStatus("OFFLINE");

    const job = await runner.executeJob(planned[0].id);

    // Job rendered successfully but delivery paused in DELIVERY_PENDING outbox
    expect(job.status).toBe("DELIVERY_PENDING");
    expect(job.videoArtifact?.filePath).toBeDefined(); // Local MP4 video rendered cleanly
    expect(job.deliveryArtifact?.deliveryMethod).toBe("LOCAL_OUTBOX");
    expect(job.deliveryArtifact?.verified).toBe(false);
  }, 30000);
});
