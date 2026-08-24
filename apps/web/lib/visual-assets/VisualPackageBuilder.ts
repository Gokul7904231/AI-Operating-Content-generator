import { VisualContext, SceneVisualPackage } from "./VisualIntelligenceTypes";

export class VisualPackageBuilder {
  run(context: VisualContext): void {
    const t0 = Date.now();
    const selected = context.selectedAsset;
    const composition = context.composition;
    const style = context.styleConfig;
    const graph = context.visualGraph;
    const intent = context.intent;
    const plan = context.plan;

    if (!composition || !style || !graph || !intent || !plan) {
      throw new Error("VisualPackageBuilder requires complete pipeline state components");
    }

    const credits = selected 
      ? `Image by ${selected.author || "Unknown"}. Source: ${selected.sourceUrl || "Wikimedia Commons"}. License: ${selected.license || "CC"}`
      : "Default System Background";

    const visualPackage: SceneVisualPackage = {
      jobId: context.jobId,
      sceneIndex: context.sceneIndex,
      background: {
        path: selected?.path || "",
        sha256: selected?.sha256 || "",
        credits,
      },
      composition,
      style,
      graph,
      metadata: {
        intent,
        plan,
        recommendation: context.recommendation,
        debug: {
          metrics: { ...context.metrics },
          rankLogs: context.visualPackage?.metadata?.debug?.rankLogs || {},
        },
      },
    };

    context.visualPackage = visualPackage;
    context.metrics.packageTime = Date.now() - t0;
    
    // Add final total pipeline time calculation
    let total = 0;
    for (const key of Object.keys(context.metrics)) {
      total += context.metrics[key];
    }
    context.visualPackage.metadata.debug.metrics.totalPipelineTime = total;
  }
}
