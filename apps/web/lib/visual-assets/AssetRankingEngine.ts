import { CandidateAsset, VisualContext } from "./VisualIntelligenceTypes";

export interface ScoreExplainability {
  relevance: number;
  quality: number;
  portrait: number;
  license: number;
  diversity: number;
  usage: number;
  behavioral: number;
}

export interface RankedAsset {
  asset: CandidateAsset;
  score: number;
  reason: ScoreExplainability;
}

export class AssetRankingEngine {
  run(context: VisualContext): void {
    const t0 = Date.now();
    const candidates = context.candidates;
    const weights = context.config.weights || {
      relevance: 0.3,
      quality: 0.15,
      portrait: 0.15,
      license: 0.15,
      diversity: 0.1,
      usage: 0.05,
      behavioral: 0.1,
    };

    const ranked: RankedAsset[] = candidates.map((candidate) => {
      // 1. Relevance: tag overlap matching intent entities
      const intentTags = context.intent?.entities.map(e => e.toLowerCase()) || [];
      const assetTags = candidate.tags?.map(t => t.toLowerCase()) || [];
      const overlap = assetTags.filter(t => intentTags.includes(t)).length;
      const relevanceScore = intentTags.length > 0 ? Math.min(1.0, overlap / intentTags.length) : 0.5;

      // 2. Quality Score
      const qualityScore = Math.min(1.0, candidate.qualityScore / 10.0);

      // 3. Portrait Suitability: near 9:16 ratio gets higher score
      const ratio = candidate.width / candidate.height;
      const targetRatio = 1080 / 1920; // 0.5625
      const ratioDiff = Math.abs(ratio - targetRatio);
      const portraitScore = Math.max(0, 1.0 - ratioDiff);

      // 4. License Quality: CC0 / Public Domain get max score, CC-BY needs attribution penalty
      const isCC0 = ["cc0", "pd", "public domain", "publicdomain"].includes(candidate.license.toLowerCase());
      const licenseScore = isCC0 ? 1.0 : 0.7;

      // 5. Diversity score: check if provider matches recent history
      const isRecentProvider = context.history.recentProviders.includes(candidate.source);
      const diversityScore = isRecentProvider ? 0.5 : 1.0;

      // 6. Usage penalty: penalize based on usageCount
      const usageScore = Math.max(0, 1.0 - (candidate.usageCount * 0.2));

      // 7. Behavioral score: reward higher CTR & historical retention rate
      const ctrVal = candidate.ctr || 0.05; // default 5%
      const retVal = candidate.retentionRate || 0.50; // default 50%
      const behavioralScore = Math.min(1.0, ctrVal * 8 + retVal * 0.8);

      // Calculate weighted score
      const finalScore =
        relevanceScore * weights.relevance +
        qualityScore * weights.quality +
        portraitScore * weights.portrait +
        licenseScore * weights.license +
        diversityScore * weights.diversity +
        usageScore * weights.usage +
        behavioralScore * (weights.behavioral || 0.1);

      const reason: ScoreExplainability = {
        relevance: relevanceScore,
        quality: qualityScore,
        portrait: portraitScore,
        license: licenseScore,
        diversity: diversityScore,
        usage: usageScore,
        behavioral: behavioralScore,
      };

      return {
        asset: candidate,
        score: Math.round(finalScore * 100) / 10, // 0 to 10 scale
        reason,
      };
    });

    // Sort descending by score
    ranked.sort((a, b) => b.score - a.score);

    // Save rank logs on context
    const rankLogs: Record<string, any> = {};
    ranked.forEach((item, index) => {
      rankLogs[item.asset.id] = {
        rank: index + 1,
        score: item.score,
        reason: item.reason,
      };
    });

    if (!context.visualPackage) {
      context.visualPackage = {} as any;
    }
    context.visualPackage!.metadata = {
      ...(context.visualPackage!.metadata || {}),
      debug: {
        metrics: {},
        rankLogs,
      },
    } as any;

    // Apply Rank-Weighted Randomization (exponential rank decay) on Top 5 candidates
    if (ranked.length > 0) {
      const pool = ranked.slice(0, 5);
      const chosenItem = this.weightedRandomSelect(pool);
      context.selectedAsset = chosenItem.asset;
      console.log(`[AssetRankingEngine] Chosen asset ID "${context.selectedAsset.id}" (Rank Score: ${chosenItem.score}/10, Source: ${context.selectedAsset.source})`);
    }

    context.metrics.rankingTime = Date.now() - t0;
  }

  private weightedRandomSelect(pool: RankedAsset[]): RankedAsset {
    if (pool.length === 1) return pool[0];
    
    // Calculate exponential rank weights: w_i = e^(-i)
    const weights = pool.map((_, index) => Math.exp(-index));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const randomVal = Math.random() * totalWeight;

    let cumulativeWeight = 0;
    for (let i = 0; i < pool.length; i++) {
      cumulativeWeight += weights[i];
      if (randomVal <= cumulativeWeight) {
        return pool[i];
      }
    }
    return pool[0];
  }
}
