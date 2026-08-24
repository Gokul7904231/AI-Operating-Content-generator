import { GeneratedQuizOutput, QuizQuestionItem } from "../adapters/QuizGeneratorAdapter";

export interface DuplicateIssue {
  type: "INTERNAL_DUPLICATE_QUESTION" | "NEGATIVE_CONSTRAINT_MATCH" | "INTERNAL_DUPLICATE_OPTION";
  questionIndex?: number;
  duplicateText: string;
  matchedWith?: string;
}

export interface QuizDuplicateCheckResult {
  hasDuplicates: boolean;
  uniquenessScore: number; // 0 to 1
  duplicates: DuplicateIssue[];
}

export class QuizDuplicateDetector {
  /**
   * Detects duplicate or near-duplicate questions within the quiz,
   * duplicate options within single questions, and matches against negative constraints.
   */
  static detect(
    quiz: GeneratedQuizOutput,
    negativeConstraints: string[] = []
  ): QuizDuplicateCheckResult {
    const duplicates: DuplicateIssue[] = [];
    const questions = quiz.questions || [];
    const seenQuestions = new Map<string, number>();

    const normalizedConstraints = negativeConstraints.map((c) =>
      this.normalizeText(c)
    );

    questions.forEach((q: QuizQuestionItem, idx: number) => {
      const normQ = this.normalizeText(q.question);

      // Check internal duplicate questions
      if (seenQuestions.has(normQ)) {
        const prevIdx = seenQuestions.get(normQ)!;
        duplicates.push({
          type: "INTERNAL_DUPLICATE_QUESTION",
          questionIndex: idx,
          duplicateText: q.question,
          matchedWith: `Question ${prevIdx + 1}`,
        });
      } else {
        seenQuestions.set(normQ, idx);
      }

      // Check negative constraints
      for (const normConstraint of normalizedConstraints) {
        if (normConstraint.length > 5 && (normQ.includes(normConstraint) || normConstraint.includes(normQ))) {
          duplicates.push({
            type: "NEGATIVE_CONSTRAINT_MATCH",
            questionIndex: idx,
            duplicateText: q.question,
            matchedWith: normConstraint,
          });
          break;
        }
      }

      // Check internal duplicate options in the question
      if (Array.isArray(q.options)) {
        const seenOpts = new Set<string>();
        q.options.forEach((opt) => {
          const normOpt = this.normalizeText(opt);
          if (seenOpts.has(normOpt)) {
            duplicates.push({
              type: "INTERNAL_DUPLICATE_OPTION",
              questionIndex: idx,
              duplicateText: opt,
            });
          } else {
            seenOpts.add(normOpt);
          }
        });
      }
    });

    const totalItems = questions.length + questions.reduce((acc, q) => acc + (q.options?.length ?? 0), 0);
    const uniquenessScore = totalItems > 0 ? Math.max(0, 1 - duplicates.length / totalItems) : 1.0;

    return {
      hasDuplicates: duplicates.length > 0,
      uniquenessScore,
      duplicates,
    };
  }

  private static normalizeText(text: string): string {
    return String(text ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }
}
