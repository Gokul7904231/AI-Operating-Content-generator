import { db } from "../firebase-admin";
import { VisualContext } from "./VisualIntelligenceTypes";

export class AssetMemory {
  /**
   * Records usage statistics, dominant colors, and channel tags for the chosen asset in Firestore
   */
  async recordUsage(context: VisualContext): Promise<void> {
    const selected = context.selectedAsset;
    if (!selected) return;

    const docId = `${context.topic.replace(/\s+/g, "_")}_${context.intent?.category.toLowerCase() || "landmarks"}_${selected.sha256}`;
    
    try {
      const docRef = db.collection("visual_assets").doc(docId);
      const snap = await docRef.get();

      const defaultColors = selected.dominantColors || ["#3b82f6"];
      
      if (snap.exists) {
        // Increment usage count and update timestamp
        await docRef.update({
          usageCount: (snap.data()?.usageCount || 0) + 1,
          lastUsed: new Date().toISOString(),
          dominantColors: defaultColors,
          ctrPlaceholder: 0.08, // baseline expectation
          retentionPlaceholder: 0.65,
          credits: selected.credits,
        });
      } else {
        // Create fallback index if missing
        await docRef.set({
          topic: context.topic,
          category: context.intent?.category || "Landmarks",
          status: "active",
          storageKey: selected.storageKey,
          sha256: selected.sha256,
          dhash: selected.dhash,
          source: selected.source,
          originalUrl: selected.sourceUrl || "mock",
          license: selected.license,
          author: selected.author,
          credits: selected.credits,
          attributionRequired: selected.attributionRequired,
          width: selected.width,
          height: selected.height,
          tags: selected.tags || [context.topic.toLowerCase()],
          qualityScore: selected.qualityScore,
          usageCount: 1,
          lastUsed: new Date().toISOString(),
          dominantColors: defaultColors,
          ctrPlaceholder: 0.08,
          retentionPlaceholder: 0.65,
        });
      }
      console.log(`[AssetMemory] Updated Firestore usage statistics for asset: ${docId}`);
    } catch (err: any) {
      console.warn(`[AssetMemory] Could not persist usage stats to Firestore: ${err.message}`);
    }
  }

  async run(context: VisualContext): Promise<void> {
    const t0 = Date.now();
    await this.recordUsage(context);
    context.metrics.memoryTime = Date.now() - t0;
  }
}
