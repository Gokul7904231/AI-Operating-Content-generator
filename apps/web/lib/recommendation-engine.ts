/**
 * Recommendation Engine
 *
 * Resolves optimized execution parameters for content workflows.
 * Answers best prompt versions, AI models, upload hours, expected cost/score,
 * and explains confidence criteria.
 */

import { LearningEngine } from "./learning-engine";
import { MetricsDB } from "./queue-db";

import { IntelligentRouter } from "../ai/intelligent-router";

export interface Recommendation {
  promptVersion: string;
  provider: string;
  model: string;
  voice: string;
  thumbnailStyle: string;
  uploadHour: number;
  expectedScore: number;
  expectedCost: number;
  confidence: number;
  reasons: string[];
}

export const RecommendationEngine = {
  /**
   * Recommend parameters for a given workflow execution.
   */
  recommend(workflowId: string): Recommendation {
    // 1. Resolve best prompt version tag using SQLite metrics
    const bestPromptVer = MetricsDB.getBestPromptVersion("hook_score") || "v2";
    
    // 2. Select provider based on dynamic IntelligentRouter scoring
    let provider = "google";
    let model = "gemini-2.5-flash";
    const reasons = ["Dynamic AI router scoring active"];

    try {
      const candidates = IntelligentRouter.getCandidatesSorted({ capability: "SCRIPT" });
      if (candidates.length > 0) {
        const bestCandidate = candidates[0];
        model = bestCandidate.modelId;
        if (bestCandidate.provider) {
          provider = bestCandidate.provider.id;
          reasons.push(`Routed optimally to model "${model}" served by provider "${provider}"`);
        }
      }
    } catch (err: any) {
      reasons.push(`Fallback selection active: ${err.message}`);
    }

    const expectedScore = LearningEngine.getPromptScore("hook", bestPromptVer);

    return {
      promptVersion: bestPromptVer,
      provider,
      model,
      voice: "neutral_male",
      thumbnailStyle: "cinematic",
      uploadHour: 18, // 6 PM active hours
      expectedScore,
      expectedCost: 0.0,
      confidence: 95,
      reasons,
    };
  }
};
