import { AIDoctor } from "../lib/core/AIDoctor";

async function main() {
  console.log("=========================================");
  console.log("      ShortFactory OS CLI Self-Test      ");
  console.log("=========================================");

  try {
    const diagnosis = await AIDoctor.runDiagnosis();
    console.log(`\nBoot Audit Status: ${diagnosis.doctorScore}/100`);
    console.log(`Timestamp: ${diagnosis.timestamp}`);
    
    console.log("\nDependencies verified:");
    console.log(JSON.stringify(diagnosis.envReport.dependenciesStatus, null, 2));

    console.log("\nSecurity audit verified:");
    console.log(JSON.stringify(diagnosis.envReport.securityAudit, null, 2));

    console.log("\nProvider reachability statuses:");
    for (const report of diagnosis.providerReports) {
      console.log(` - ${report.name} (${report.id}): ${report.status} (latency: ${report.latency}ms, models: ${report.modelCount})`);
    }

    console.log("\nWorkflow Registry checks:");
    console.log(` - Engines registered count: ${diagnosis.workflowStatus.enginesRegistered.length}`);
    console.log(` - Active lists: [${diagnosis.workflowStatus.enginesRegistered.join(", ")}]`);

    console.log("\nImage Pipeline checks:");
    console.log(` - Sharp loaded: ${diagnosis.pipelineStatus.sharpLoaded}`);

    console.log("\nRecommendations:");
    for (const rec of diagnosis.recommendations) {
      console.log(` * ${rec}`);
    }

    console.log("\n=========================================");
    if (diagnosis.doctorScore >= 70) {
      console.log("   ✅ SELF-TEST STATUS: PASS");
      process.exit(0);
    } else {
      console.log("   ⚠️  SELF-TEST STATUS: WARNING / DEGRADED");
      process.exit(0);
    }
  } catch (err) {
    console.error("❌ CLI Self-Test failed with critical error:", err);
    process.exit(1);
  }
}

main();
