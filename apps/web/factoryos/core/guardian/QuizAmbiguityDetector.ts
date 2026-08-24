import { GeneratedQuizOutput, QuizQuestionItem } from "../adapters/QuizGeneratorAdapter";

export interface AmbiguityIssue {
  code: "ANSWER_NOT_IN_OPTIONS" | "AMBIGUOUS_OPTIONS" | "TRIVIAL_OPTION_PATTERN";
  questionIndex: number;
  message: string;
}

export interface QuizAmbiguityCheckResult {
  hasAmbiguity: boolean;
  ambiguityScore: number; // 1 = clear, 0 = highly ambiguous
  issues: AmbiguityIssue[];
}

export class QuizAmbiguityDetector {
  /**
   * Detects ambiguity in quiz questions:
   * - Verifies answer matches at least one option exactly (or case-insensitively).
   * - Detects identical/overlapping option texts.
   * - Detects unsupported positional phrases ("all of the above", "none of the above") if options are shuffled.
   */
  static detect(quiz: GeneratedQuizOutput): QuizAmbiguityCheckResult {
    const issues: AmbiguityIssue[] = [];
    const questions = quiz.questions || [];

    questions.forEach((q: QuizQuestionItem, idx: number) => {
      const normOptions = (q.options || []).map((o) => String(o).trim().toLowerCase());
      const normAnswer = String(q.answer ?? "").trim().toLowerCase();

      // 1. Answer presence in options
      if (!normOptions.includes(normAnswer)) {
        issues.push({
          code: "ANSWER_NOT_IN_OPTIONS",
          questionIndex: idx,
          message: `Question ${idx + 1} answer "${q.answer}" does not match any of the provided options: [${q.options?.join(", ")}].`,
        });
      }

      // 2. Positional phrasing ambiguity check
      for (const opt of q.options || []) {
        const lowerOpt = opt.toLowerCase();
        if (lowerOpt.includes("all of the above") || lowerOpt.includes("none of the above") || lowerOpt.includes("both a and b")) {
          issues.push({
            code: "TRIVIAL_OPTION_PATTERN",
            questionIndex: idx,
            message: `Question ${idx + 1} uses positional option "${opt}" which creates ambiguity if options are dynamically rendered.`,
          });
        }
      }

      // 3. Option text overlap / trivial options
      const uniqueNormOptions = new Set(normOptions);
      if (uniqueNormOptions.size < normOptions.length) {
        issues.push({
          code: "AMBIGUOUS_OPTIONS",
          questionIndex: idx,
          message: `Question ${idx + 1} has non-unique options.`,
        });
      }
    });

    const totalQuestions = questions.length;
    const ambiguityScore = totalQuestions > 0 ? Math.max(0, 1 - issues.length / totalQuestions) : 1.0;

    return {
      hasAmbiguity: issues.length > 0,
      ambiguityScore,
      issues,
    };
  }
}
