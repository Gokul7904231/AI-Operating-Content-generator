/**
 * FactoryOS Quiz Orchestrator
 * 
 * Handles deterministic multi-topic equal question allocation,
 * input validation (N <= Q), and question revision/provenance metadata.
 */

import { QuizTopicAllocation, QuizQuestionMetadata } from "../core/EngineContracts";

export class QuizOrchestrator {
  /**
   * Computes deterministic equal question allocation across N topics for Q questions.
   * Enforces N <= Q.
   */
  static calculateEqualAllocation(
    topicNames: string[],
    totalQuestions: number
  ): QuizTopicAllocation[] {
    const cleanTopics = topicNames
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (cleanTopics.length === 0) {
      throw new Error("At least one topic must be specified.");
    }

    if (totalQuestions <= 0) {
      throw new Error("Total questions must be a positive integer.");
    }

    const n = cleanTopics.length;
    const q = totalQuestions;

    if (n > q) {
      throw new Error(`Topic count (${n}) cannot exceed total questions (${q}).`);
    }

    const base = Math.floor(q / n);
    const remainder = q % n;

    const allocations: QuizTopicAllocation[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < n; i++) {
      const name = cleanTopics[i];
      let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      if (!slug) slug = `topic-${i + 1}`;
      if (seenIds.has(slug)) {
        slug = `${slug}-${i + 1}`;
      }
      seenIds.add(slug);

      // Distribute remainder deterministically to the first 'remainder' topics
      const budget = base + (i < remainder ? 1 : 0);

      allocations.push({
        topicId: slug,
        name,
        questionBudget: budget,
      });
    }

    return allocations;
  }

  /**
   * Normalizes question objects to ensure stable questionId, revision, topicId, and verificationStatus.
   */
  static attachQuestionMetadata(
    questions: any[],
    defaultTopicId?: string,
    defaultTopicName?: string
  ): Array<any & QuizQuestionMetadata> {
    return questions.map((q, idx) => {
      const qId = q.questionId || `q${idx + 1}`;
      const rev = typeof q.revision === "number" ? q.revision : 1;
      const topicId = q.topicId || defaultTopicId || "general";
      const topicName = q.topicName || defaultTopicName || "General";
      const verificationStatus = q.verificationStatus || "UNVERIFIED";

      return {
        ...q,
        questionId: qId,
        revision: rev,
        topicId,
        topicName,
        verificationStatus,
      };
    });
  }

  /**
   * Marks a modified question as revised, bumping revision number and invalidating verification state.
   */
  static markQuestionEdited(question: any): any & QuizQuestionMetadata {
    const currentRev = typeof question.revision === "number" ? question.revision : 1;
    return {
      ...question,
      revision: currentRev + 1,
      verificationStatus: "PENDING",
      evidence: [],
      nliResult: undefined,
      score: undefined,
    };
  }
}
