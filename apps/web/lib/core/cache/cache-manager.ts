import { PromptCache } from "./prompt-cache";
import { SceneCache } from "./scene-cache";
import { ImageCache } from "./image-cache";
import { VoiceCache } from "./voice-cache";
import { VideoCache } from "./video-cache";
import { ProviderCache } from "./provider-cache";
import { BenchmarkCache } from "./benchmark-cache";
import { ModelCache } from "./model-cache";
import { CacheStats } from "./cache";

export const CacheManager = {
  getCaches() {
    return {
      prompt: PromptCache,
      scene: SceneCache,
      image: ImageCache,
      voice: VoiceCache,
      video: VideoCache,
      provider: ProviderCache,
      benchmark: BenchmarkCache,
      model: ModelCache,
    };
  },

  getAllStats(): Record<string, CacheStats> {
    const caches = this.getCaches();
    const report: Record<string, CacheStats> = {};
    for (const [key, cache] of Object.entries(caches)) {
      report[key] = (cache as any).stats();
    }
    return report;
  },

  getCombinedStats() {
    const stats = this.getAllStats();
    let hits = 0;
    let misses = 0;
    let lookups = 0;
    let evictions = 0;
    let size = 0;
    let totalLookupTimeMs = 0;

    for (const s of Object.values(stats) as CacheStats[]) {
      hits += s.hits;
      misses += s.misses;
      lookups += s.lookups;
      evictions += s.evictions;
      size += s.size;
      totalLookupTimeMs += s.avgLookupTimeMs * s.lookups;
    }

    const avgLookupTimeMs = lookups > 0 ? totalLookupTimeMs / lookups : 0;
    const hitRate = lookups > 0 ? (hits / lookups) * 100 : 0;
    const missRate = lookups > 0 ? (misses / lookups) * 100 : 0;

    return {
      hits,
      misses,
      lookups,
      evictions,
      size,
      avgLookupTimeMs,
      hitRate,
      missRate,
    };
  },

  async clearAll() {
    const caches = this.getCaches();
    for (const cache of Object.values(caches)) {
      // BaseCache internal map clearing
      (cache as any).map.clear();
      (cache as any).hitsCount = 0;
      (cache as any).missesCount = 0;
      (cache as any).lookupsCount = 0;
      (cache as any).evictionsCount = 0;
      (cache as any).totalLookupTimeMs = 0;
    }
  },
};
