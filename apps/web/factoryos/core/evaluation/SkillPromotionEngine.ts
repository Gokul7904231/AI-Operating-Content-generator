/**
 * FactoryOS Frontier v3 — Skill Promotion Engine & Evaluation Registry
 * Manages skill lifecycle progression (DRAFT -> VALIDATING -> EXPERIMENTAL -> PROMOTED)
 * based on NVIDIA SkillEvaluator outcomes and configured promotion thresholds.
 */

import { SkillManifest, SkillExecutionPackage, SkillLifecycleState } from "../contracts/SkillContracts";
import { CompleteSkillEvaluation, SkillEvaluatorRunner } from "./SkillEvaluatorRunner";
import { SkillPromotionThresholds } from "../contracts/PolicyContracts";

export class SkillPromotionEngine {
  private static defaultThresholds: SkillPromotionThresholds = {
    tier1: {
      requireZeroCritical: true,
      requireZeroSecurityFindings: true,
    },
    tier2: {
      allowHighSimilarity: false,
      maxSimilarityScore: 0.85,
    },
    tier3: {
      defaultMinSkillLift: 0.05,
      defaultMinPassAtK: 0.80,
      perSkillOverrides: {
        "quota-management": { minSkillLift: 0.0, minPassAtK: 0.99 },
        "render-orchestration": { minSkillLift: 0.05, minPassAtK: 0.95 },
        "worker-routing": { minSkillLift: 0.05, minPassAtK: 0.95 },
        "trend-analysis": { minSkillLift: 0.05, minPassAtK: 0.80 },
      },
    },
  };

  private static registry: Map<string, SkillManifest> = new Map();
  private static evalHistory: CompleteSkillEvaluation[] = [];

  static registerSkill(manifest: SkillManifest): void {
    this.registry.set(`${manifest.id}@${manifest.version}`, { ...manifest });
  }

  static getSkill(id: string, version?: string): SkillManifest | undefined {
    if (version) {
      return this.registry.get(`${id}@${version}`);
    }
    // Return latest promoted version or latest version
    const matches = Array.from(this.registry.values()).filter((s) => s.id === id);
    if (matches.length === 0) return undefined;
    const promoted = matches.find((s) => s.lifecycleState === "PROMOTED");
    return promoted || matches[matches.length - 1];
  }

  static getAllSkills(): SkillManifest[] {
    return Array.from(this.registry.values());
  }

  static getEvalHistory(skillId?: string): CompleteSkillEvaluation[] {
    if (!skillId) return [...this.evalHistory];
    return this.evalHistory.filter((e) => e.skillId === skillId);
  }

  /**
   * Evaluates a skill package through Tier 1, Tier 2, and optionally Tier 3,
   * then updates its lifecycle state.
   */
  static evaluateAndPromote(
    pkg: SkillExecutionPackage,
    benchmarkCases?: Array<{ name: string; run: (withSkill: boolean) => boolean }>
  ): {
    lifecycleState: SkillLifecycleState;
    evaluation: CompleteSkillEvaluation;
    reason: string;
  } {
    const manifest = pkg.manifest;
    const evalId = `eval_${manifest.id}_${Date.now()}`;

    // 1. Tier 1 Deterministic
    const tier1 = SkillEvaluatorRunner.runTier1(pkg);
    if (!tier1.passed) {
      const evalRec: CompleteSkillEvaluation = {
        evaluationId: evalId,
        skillId: manifest.id,
        skillVersion: manifest.version,
        tier1,
        overallPassed: false,
        evaluationCostUsd: 0,
        timestamp: new Date().toISOString(),
      };
      this.evalHistory.push(evalRec);
      return {
        lifecycleState: "QUARANTINED",
        evaluation: evalRec,
        reason: `Tier 1 static/security validation failed: ${tier1.findings.map((f) => f.message).join("; ")}`,
      };
    }

    // 2. Tier 2 Semantic Dedup
    const existingSkills = this.getAllSkills();
    const tier2 = SkillEvaluatorRunner.runTier2(pkg, existingSkills);
    if (!tier2.passed && !this.defaultThresholds.tier2.allowHighSimilarity) {
      const evalRec: CompleteSkillEvaluation = {
        evaluationId: evalId,
        skillId: manifest.id,
        skillVersion: manifest.version,
        tier1,
        tier2,
        overallPassed: false,
        evaluationCostUsd: 0,
        timestamp: new Date().toISOString(),
      };
      this.evalHistory.push(evalRec);
      return {
        lifecycleState: "QUARANTINED",
        evaluation: evalRec,
        reason: `Tier 2 deduplication failed: ${tier2.findings.map((f) => f.message).join("; ")}`,
      };
    }

    // 3. Tier 3 Live Agent Evaluation (if benchmark cases provided or critical profile)
    let tier3;
    const profile = manifest.evaluationProfile || {
      isCritical: false,
      minSkillLift: this.defaultThresholds.tier3.defaultMinSkillLift,
      minPassAtK: this.defaultThresholds.tier3.defaultMinPassAtK,
      tier1Strict: true,
      tier2EmbeddingDedup: true,
      tier3AgentEval: false,
    };

    const override = this.defaultThresholds.tier3.perSkillOverrides?.[manifest.id];
    const minLift = override?.minSkillLift ?? profile.minSkillLift;
    const minPass = override?.minPassAtK ?? profile.minPassAtK;

    if (benchmarkCases && benchmarkCases.length > 0) {
      tier3 = SkillEvaluatorRunner.runTier3(pkg, benchmarkCases);
      if (tier3.skillLift < minLift || tier3.passAtK < minPass) {
        const evalRec: CompleteSkillEvaluation = {
          evaluationId: evalId,
          skillId: manifest.id,
          skillVersion: manifest.version,
          tier1,
          tier2,
          tier3,
          overallPassed: false,
          evaluationCostUsd: 0,
          timestamp: new Date().toISOString(),
        };
        this.evalHistory.push(evalRec);
        return {
          lifecycleState: "EXPERIMENTAL",
          evaluation: evalRec,
          reason: `Tier 3 benchmarks below threshold (Skill Lift: ${(tier3.skillLift * 100).toFixed(1)}% vs min ${(minLift * 100).toFixed(1)}%, pass@k: ${(tier3.passAtK * 100).toFixed(1)}% vs min ${(minPass * 100).toFixed(1)}%).`,
        };
      }
    }

    const evalRec: CompleteSkillEvaluation = {
      evaluationId: evalId,
      skillId: manifest.id,
      skillVersion: manifest.version,
      tier1,
      tier2,
      tier3,
      overallPassed: true,
      evaluationCostUsd: 0,
      timestamp: new Date().toISOString(),
    };
    this.evalHistory.push(evalRec);

    const promotedManifest: SkillManifest = {
      ...manifest,
      lifecycleState: "PROMOTED",
      updatedAt: new Date().toISOString(),
    };
    this.registerSkill(promotedManifest);

    return {
      lifecycleState: "PROMOTED",
      evaluation: evalRec,
      reason: "All validation and benchmark gates satisfied. Skill successfully promoted to production.",
    };
  }
}
