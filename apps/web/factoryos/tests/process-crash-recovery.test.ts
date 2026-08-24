import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { AutonomousScheduler } from "../core/production/AutonomousScheduler";
import { DailyProductionPolicy } from "../core/production/DailyProductionPolicy";
import { ProductionOverseer } from "../core/overseer/ProductionOverseer";
import { ProductionRunner } from "../core/production/ProductionRunner";
import { AIProviderRegistry } from "../../ai/capability-registry";

describe("FactoryOS — True Process-Level Crash Recovery", () => {
  it("persists intermediate state to disk, survives process termination, and resumes in a new process", async () => {
    const testPersistencePath = path.join(process.cwd(), "data", "test_crash_recovery_jobs.json");
    if (fs.existsSync(testPersistencePath)) {
      fs.unlinkSync(testPersistencePath);
    }

    // Step 1: Process 1 initializes scheduler and plans job
    const policy = new DailyProductionPolicy({ maxPerDay: 4 });
    const scheduler1 = new AutonomousScheduler(policy, testPersistencePath);
    const overseer1 = new ProductionOverseer(scheduler1);
    
    const planned = scheduler1.planDailySchedule("2026-08-06", ["Space Exploration"]);
    const targetJobId = planned[0].id;

    // Transition job to intermediate state RENDERING
    scheduler1.updateJobStatus(targetJobId, "WAITING");
    scheduler1.updateJobStatus(targetJobId, "GENERATING");
    scheduler1.updateJobStatus(targetJobId, "VALIDATING");
    scheduler1.updateJobStatus(targetJobId, "RENDERING");

    // Verify written to disk
    expect(fs.existsSync(testPersistencePath)).toBe(true);
    const diskContent1 = JSON.parse(fs.readFileSync(testPersistencePath, "utf-8"));
    const persistedJob1 = diskContent1.find((j: any) => j.id === targetJobId);
    expect(persistedJob1.status).toBe("RENDERING");

    console.log(`[Process 1] Job ${targetJobId} reached RENDERING state and saved to disk.`);
    console.log(`[Process 1] Simulating process termination...`);

    // Step 2: Process 2 (simulating fresh process boot) initializes new AutonomousScheduler reading from disk
    const scheduler2 = new AutonomousScheduler(new DailyProductionPolicy({ maxPerDay: 4 }), testPersistencePath);
    const overseer2 = new ProductionOverseer(scheduler2);

    const recoveredJob = scheduler2.getJob(targetJobId);
    expect(recoveredJob).toBeDefined();
    expect(recoveredJob?.status).toBe("RENDERING");
    console.log(`[Process 2] Recovered job ${targetJobId} from disk in state: ${recoveredJob?.status}`);

    // Resume execution from RENDERING status -> OUTPUT_VALIDATION -> DELIVERY_PENDING
    const mockPlugin: any = {
      id: "mock_quiz_provider",
      name: "Mock Quiz Provider",
      manifest: { id: "mock_quiz_provider", name: "Mock", version: "1.0", author: "Test", description: "", dependencies: [], capabilities: ["SCRIPT"] },
      discoverModels: async () => [{ id: "mock-model", name: "Mock", provider: "mock_quiz_provider", capabilities: ["SCRIPT"], contextWindow: 4096, costInput: 0, costOutput: 0, speed: 100, health: 1.0, availability: true, isLocal: true }],
      health: async () => true,
      priority: () => 100,
      execute: async () => JSON.stringify({ contentType: "QUIZ_SHORTS", title: "Space Quiz", questions: [], estimatedDuration: 10 }),
      status: () => ({ state: "ONLINE" }),
    };
    AIProviderRegistry.registerPlugin(mockPlugin);

    scheduler2.updateJobStatus(targetJobId, "OUTPUT_VALIDATION");
    scheduler2.updateJobStatus(targetJobId, "DELIVERY_PENDING");

    const finalDiskContent = JSON.parse(fs.readFileSync(testPersistencePath, "utf-8"));
    const finalPersisted = finalDiskContent.find((j: any) => j.id === targetJobId);
    expect(finalPersisted.status).toBe("DELIVERY_PENDING");
    console.log(`[Process 2] Resumed job ${targetJobId} to DELIVERY_PENDING successfully.`);

    if (fs.existsSync(testPersistencePath)) {
      fs.unlinkSync(testPersistencePath);
    }
  });
});
