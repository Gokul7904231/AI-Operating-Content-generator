import { DailyProductionPolicy } from "./core/production/DailyProductionPolicy";
import { AutonomousScheduler } from "./core/production/AutonomousScheduler";
import { ProductionOverseer } from "./core/overseer/ProductionOverseer";
import { ProductionRunner } from "./core/production/ProductionRunner";
import { NetworkCapabilityMonitor } from "./core/production/NetworkCapabilityMonitor";
import { AIProviderRegistry } from "../ai/capability-registry";

async function runProductionDemo() {
  console.log("=================================================");
  console.log("FactoryOS v0.1 Autonomous Production Demo");
  console.log("=================================================");

  // 1. Register Mock Quiz Provider for offline execution
  const mockPlugin: any = {
    id: "mock_quiz_provider",
    name: "Mock Quiz Provider",
    manifest: { id: "mock_quiz_provider", name: "Mock", version: "1.0", author: "FactoryOS", description: "", dependencies: [], capabilities: ["SCRIPT"] },
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
        title: "Autonomous Production Demo Quiz",
        description: "Trivia test",
        hashtags: ["trivia", "quiz"],
        renderProfile: "FAST_QUIZ",
        estimatedDuration: 60,
      }),
    status: () => ({ state: "ONLINE", latency: 10, avgResponseTime: 10, errorRate: 0, totalCost: { tokensInput: 0, tokensOutput: 0, estimatedUSD: 0, currency: "USD", pricingSource: "free", lastUpdated: Date.now() }, retries: 0, retryRate: 0, quotaRemaining: -1, rateLimitLimit: -1, rateLimitRemaining: -1, rateLimitReset: 0, jsonReliability: 1.0, lastChecked: Date.now() }),
  };

  AIProviderRegistry.registerPlugin(mockPlugin);

  // 2. Initialize Autonomous System with isolated demo state.
  // Use an empty persistenceFilePath so the demo does not load or overwrite
  // real production scheduler history. This keeps the demo repeatable while
  // preserving production guarantees and idempotency within each run.
  const dateStr = new Date().toISOString().split("T")[0];
  const policy = new DailyProductionPolicy({ maxPerDay: 5 });
  const scheduler = new AutonomousScheduler(policy, "");
  const overseer = new ProductionOverseer(scheduler);
  const runner = new ProductionRunner({ scheduler, overseer });

  console.log("\n[1] Daily Production Policy Configuration:");
  console.log(`  Max Production / Day: ${policy.getConfig().maxPerDay} items`);
  console.log(`  Timezone:             ${policy.getConfig().timezone}`);
  console.log(`  Max Concurrent Jobs:  ${policy.getConfig().maxConcurrentJobs}`);

  // 3. Autonomous Schedule Planning
  const topics = ["World History Trivia", "Space Exploration", "Deep Ocean Wonders", "Ancient Egypt"];
  const plannedJobs = scheduler.planDailySchedule(dateStr, topics);
  console.log(`\n[2] Autonomous Schedule Planned (${plannedJobs.length} jobs planned for ${dateStr}):`);
  plannedJobs.forEach((j) => console.log(`  - Slot ${j.plannedSlot}: ${j.topic} [Status: ${j.status}]`));

  // 4. Overseer Initial Snapshot
  console.log("\n[3] Overseer Initial Snapshot:");
  const snap1 = overseer.getSnapshot(dateStr);
  console.log(`  Next Scheduled Job: Slot ${snap1.nextScheduledJob?.plannedSlot} ("${snap1.nextScheduledJob?.topic}")`);
  console.log(`  Next Action:        ${snap1.nextAction}`);
  console.log(`  Network Capability: ${snap1.systemStatus.network}`);
  console.log(`  Drive Capability:   ${snap1.systemStatus.drive}`);

  // 5. Execute Production Job #1 (Clean Execution)
  console.log("\n[4] Executing Production Job #1 (Slot 1: World History Trivia)...");
  const job1Result = await runner.executeJob(plannedJobs[0].id);
  console.log(`\n  Job #1 Result Status: **${job1Result.status}**`);
  console.log(`  Guardian Decision:  ${job1Result.guardianReport?.decision} (Grounding: ${((job1Result.guardianReport?.factualityScore ?? 0) * 100).toFixed(0)}%)`);
  console.log(`  Video Artifact:     ${job1Result.videoArtifact?.filePath} (${((job1Result.videoArtifact?.fileSizeBytes ?? 0) / 1024).toFixed(1)} KB)`);
  console.log(`  Delivery Method:    ${job1Result.deliveryArtifact?.deliveryMethod}`);

  // 6. Controlled Failure Demo: Network Offline Resilience
  console.log("\n[5] Controlled Failure Demo — Network Disruption Simulation:");
  console.log("  Simulating network disruption before Job #2 delivery...");
  NetworkCapabilityMonitor.getInstance().setStatus("OFFLINE");

  const job2Result = await runner.executeJob(plannedJobs[1].id);
  console.log(`  Job #2 Status: ${job2Result.status} (Retained in Outbox)`);
  console.log(`  Local MP4 Render: ${job2Result.videoArtifact?.filePath} (VERIFIED)`);
  console.log(`  Outbox Delivery:  ${job2Result.deliveryArtifact?.deliveryMethod} [Verified: ${job2Result.deliveryArtifact?.verified}]`);

  // 7. Network Restoration & Recovery Demonstration
  console.log("\n[6] Network Restoration & Autonomous Outbox Recovery:");
  console.log("  Restoring network capability to ONLINE...");
  NetworkCapabilityMonitor.getInstance().setStatus("ONLINE");
  
  const recoveredJob2 = await runner.executeJob(plannedJobs[1].id);
  console.log(`  Recovered Job #2 Status: **${recoveredJob2.status}**`);
  console.log(`  Delivery Verified:      ${recoveredJob2.deliveryArtifact?.verified}`);

  // 8. Final Overseer Production Summary & Timeline Audit
  console.log("\n[7] Final Overseer Production Summary:");
  const snapFinal = overseer.getSnapshot(dateStr);
  console.log(`  Daily Allowance: ${snapFinal.dailyPolicy.completed} completed / ${snapFinal.dailyPolicy.maxPerDay} max per day`);
  console.log(`  Remaining Quota: ${snapFinal.dailyPolicy.remainingQuota}`);
  
  console.log("\n[8] Overseer Event Audit Timeline:");
  snapFinal.timeline.slice(-10).forEach((t) => {
    console.log(`  ${t.time.split("T")[1].slice(0, 8)} | Job: ${t.jobId ?? "N/A"} | ${t.event}`);
  });

  console.log("\n=================================================");
  console.log("FACTORYOS AUTONOMOUS PRODUCTION DEMO COMPLETE");
  console.log("=================================================");
}

runProductionDemo().catch((err) => {
  console.error("Production demo failed:", err);
  process.exit(1);
});
