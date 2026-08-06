import { GeneratedQuizOutput } from "../adapters/QuizGeneratorAdapter";

export type OriginalityVerdict = "READY" | "REVIEW_REQUIRED" | "BLOCKED";

export interface OriginalityCheckResult {
  verdict: OriginalityVerdict;
  similarityScore: number; // 0 to 1
  reasons: string[];
}

export class ContentOriginalityGate {
  /**
   * Evaluates a candidate quiz payload against recent production history to prevent
   * repetitive question sets, duplicate hooks, or identical titles.
   */
  static evaluate(candidateQuiz: GeneratedQuizOutput, previousQuizzes: GeneratedQuizOutput[] = []): OriginalityCheckResult {
    const reasons: string[] = [];

    if (!candidateQuiz || !Array.isArray(candidateQuiz.questions) || candidateQuiz.questions.length === 0) {
      return { verdict: "BLOCKED", similarityScore: 1.0, reasons: ["Malformed or empty candidate quiz payload."] };
    }

    const candidateTitle = String(candidateQuiz.title ?? "").trim().toLowerCase();
    const candidateHook = String(candidateQuiz.hook ?? "").trim().toLowerCase();
    const candidateQuestionTexts = candidateQuiz.questions.map((q) => String(q.question).trim().toLowerCase());

    let maxSimilarity = 0.0;

    for (const prev of previousQuizzes) {
      const prevTitle = String(prev.title ?? "").trim().toLowerCase();
      const prevHook = String(prev.hook ?? "").trim().toLowerCase();
      const prevQuestionTexts = (prev.questions || []).map((q) => String(q.question).trim().toLowerCase());

      // Title match
      if (candidateTitle && candidateTitle === prevTitle) {
        reasons.push(`Exact duplicate title matched previous production: "${prev.title}"`);
        maxSimilarity = Math.max(maxSimilarity, 1.0);
      }

      // Hook match
      if (candidateHook && candidateHook === prevHook) {
        reasons.push(`Exact duplicate hook matched previous production: "${prev.hook}"`);
        maxSimilarity = Math.max(maxSimilarity, 0.9);
      }

      // Question overlap
      let sharedQCount = 0;
      for (const qText of candidateQuestionTexts) {
        if (prevQuestionTexts.includes(qText)) {
          sharedQCount++;
        }
      }

      if (candidateQuestionTexts.length > 0) {
        const overlapRatio = sharedQCount / candidateQuestionTexts.length;
        if (overlapRatio > 0.5) {
          reasons.push(`High question overlap (${(overlapRatio * 100).toFixed(0)}%) matched previous production.`);
          maxSimilarity = Math.max(maxSimilarity, overlapRatio);
        }
      }
    }

    let verdict: OriginalityVerdict = "READY";
    if (maxSimilarity >= 0.85) {
      verdict = "BLOCKED";
    } else if (maxSimilarity >= 0.50) {
      verdict = "REVIEW_REQUIRED";
    }

    return {
      verdict,
      similarityScore: maxSimilarity,
      reasons,
    };
  }
}
