import { GeneratedQuizOutput, QuizQuestionItem } from "../adapters/QuizGeneratorAdapter";

export interface ValidationIssue {
  code: string;
  message: string;
  questionIndex?: number;
  severity: "error" | "warning";
}

export interface QuizOutputValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  totalQuestions: number;
}

export class QuizOutputValidator {
  /**
   * Validates structural integrity and schema constraints of generated quiz output.
   */
  static validate(quiz: GeneratedQuizOutput, minQuestions = 3): QuizOutputValidationResult {
    const issues: ValidationIssue[] = [];

    if (!quiz.hook || quiz.hook.trim().length === 0) {
      issues.push({
        code: "MISSING_HOOK",
        message: "Quiz hook is empty or missing.",
        severity: "error",
      });
    }

    if (!Array.isArray(quiz.questions) || quiz.questions.length < minQuestions) {
      issues.push({
        code: "INSUFFICIENT_QUESTIONS",
        message: `Quiz contains ${quiz.questions?.length ?? 0} questions; minimum required is ${minQuestions}.`,
        severity: "error",
      });
      return { valid: false, issues, totalQuestions: quiz.questions?.length ?? 0 };
    }

    quiz.questions.forEach((q: QuizQuestionItem, idx: number) => {
      if (!q.question || q.question.trim().length === 0) {
        issues.push({
          code: "EMPTY_QUESTION",
          message: `Question ${idx + 1} text is empty.`,
          questionIndex: idx,
          severity: "error",
        });
      }

      if (!Array.isArray(q.options) || q.options.length < 2) {
        issues.push({
          code: "INSUFFICIENT_OPTIONS",
          message: `Question ${idx + 1} must have at least 2 options (found ${q.options?.length ?? 0}).`,
          questionIndex: idx,
          severity: "error",
        });
      } else {
        const emptyOpts = q.options.filter((o) => !o || o.trim().length === 0);
        if (emptyOpts.length > 0) {
          issues.push({
            code: "EMPTY_OPTION",
            message: `Question ${idx + 1} has ${emptyOpts.length} empty option string(s).`,
            questionIndex: idx,
            severity: "error",
          });
        }
      }

      if (!q.answer || q.answer.trim().length === 0) {
        issues.push({
          code: "MISSING_ANSWER",
          message: `Question ${idx + 1} has no answer specified.`,
          questionIndex: idx,
          severity: "error",
        });
      }

      if (!q.explanation || q.explanation.trim().length === 0) {
        issues.push({
          code: "MISSING_EXPLANATION",
          message: `Question ${idx + 1} is missing an explanation.`,
          questionIndex: idx,
          severity: "warning",
        });
      }
    });

    const hasErrors = issues.some((i) => i.severity === "error");
    return {
      valid: !hasErrors,
      issues,
      totalQuestions: quiz.questions.length,
    };
  }
}
