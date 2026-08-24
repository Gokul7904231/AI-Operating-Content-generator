import { GeneratedQuizOutput } from "../adapters/QuizGeneratorAdapter";
import { QuizOutputValidator } from "./QuizOutputValidator";
import { QuizDuplicateDetector } from "./QuizDuplicateDetector";
import { QuizAmbiguityDetector } from "./QuizAmbiguityDetector";
import { QuizEvidenceVerifier } from "./QuizEvidenceVerifier";
import { SemanticOptionValidator } from "./ambiguity/SemanticOptionValidator";
import { QuizQualityReport, QuizQualityReportData, QuizGuardianDecision } from "./QuizQualityReport";

export class QuizGuardian {
  private evidenceVerifier: QuizEvidenceVerifier;
  private semanticOptionValidator: SemanticOptionValidator;

  constructor(options?: {
    evidenceVerifier?: QuizEvidenceVerifier;
    semanticOptionValidator?: SemanticOptionValidator;
  }) {
    this.evidenceVerifier = options?.evidenceVerifier ?? new QuizEvidenceVerifier();
    this.semanticOptionValidator = options?.semanticOptionValidator ?? new SemanticOptionValidator();
  }

  async evaluate(
    quiz: GeneratedQuizOutput,
    options?: {
      negativeConstraints?: string[];
      minQuestions?: number;
    }
  ): Promise<QuizQualityReportData> {
    const minQ = options?.minQuestions ?? 3;
    const negConstraints = options?.negativeConstraints ?? [];

    // 1. Structure validation
    const structureVal = QuizOutputValidator.validate(quiz, minQ);

    // 2. Duplicate check
    const dupCheck = QuizDuplicateDetector.detect(quiz, negConstraints);

    // 3. Structural Ambiguity check
    const ambCheck = QuizAmbiguityDetector.detect(quiz);

    // 4. Factuality & NLI Evidence check
    const factCheck = await this.evidenceVerifier.verifyFactuality(quiz);

    // 5. Semantic Option check (Cascaded Level 1, 2, 3)
    const semanticCheck = await this.semanticOptionValidator.validateQuizOptions(
      quiz,
      factCheck.evidencePacksByQuestion
    );

    // Scores
    const structureScore = structureVal.valid ? 1.0 : 0.0;
    const uniquenessScore = quiz.questions?.length > 0 ? dupCheck.uniquenessScore : 0.0;
    const ambiguityScore = quiz.questions?.length > 0 ? ambCheck.ambiguityScore : 0.0;
    const semanticScore = quiz.questions?.length > 0 ? semanticCheck.score : 0.0;
    const factualityScore = quiz.questions?.length > 0 ? factCheck.overallFactualityScore : 0.0;

    const overallScore = quiz.questions?.length > 0
      ? (structureScore * 0.25 + uniquenessScore * 0.20 + ambiguityScore * 0.15 + semanticScore * 0.20 + factualityScore * 0.20)
      : 0.0;

    const summaryReasons: string[] = [];

    structureVal.issues.forEach((i) => summaryReasons.push(`Structure Issue: ${i.message}`));
    dupCheck.duplicates.forEach((d) => summaryReasons.push(`Duplicate Issue: [${d.type}] ${d.duplicateText}`));
    ambCheck.issues.forEach((a) => summaryReasons.push(`Structural Ambiguity: ${a.message}`));
    semanticCheck.issues.forEach((s) => summaryReasons.push(`Semantic Ambiguity: ${s.message}`));
    factCheck.questionChecks
      .filter((c) => c.status !== "SUPPORTED")
      .forEach((c) => summaryReasons.push(`Factuality Issue (Q${c.questionIndex + 1}): [${c.status}] ${c.reason}`));

    let decision: QuizGuardianDecision = "PASS";

    // ABSOLUTE POLICY ENFORCEMENT FOR PASS:
    // Structure PASS AND Duplicate PASS AND Structural Ambiguity PASS AND Semantic Ambiguity PASS AND Factual Support PASS
    const hasFatalStructure = !structureVal.valid;
    const hasContradiction = factCheck.hasContradictions;
    const hasMultipleValidAnswers = semanticCheck.issues.some((i) => i.code === "MULTIPLE_VALID_ANSWERS");
    const hasNoSupportedAnswer = semanticCheck.issues.some((i) => i.code === "NO_SUPPORTED_ANSWER");
    const hasSemanticDuplicates = semanticCheck.issues.some((i) => i.code === "SEMANTIC_EQUIVALENT_OPTIONS" || i.code === "EQUIVALENT_OPTIONS");

    if (hasFatalStructure || overallScore < 0.40) {
      decision = "REJECT";
    } else if (
      dupCheck.hasDuplicates ||
      ambCheck.hasAmbiguity ||
      hasSemanticDuplicates ||
      hasContradiction ||
      hasMultipleValidAnswers ||
      hasNoSupportedAnswer ||
      factCheck.hasInsufficientEvidence ||
      factualityScore < 0.70 ||
      overallScore < 0.75
    ) {
      decision = "REPAIR";
    }

    return {
      quizTitle: quiz.title || "Untitled Quiz",
      totalQuestions: quiz.questions?.length || 0,
      decision,
      overallScore,
      structureScore,
      uniquenessScore,
      ambiguityScore,
      semanticScore,
      factualityScore,
      insufficientEvidenceCount: factCheck.insufficientEvidenceCount,
      summaryReasons,
      structureValidation: structureVal,
      duplicateCheck: dupCheck,
      ambiguityCheck: ambCheck,
      semanticOptionValidation: semanticCheck,
      factualityCheck: factCheck,
      timestamp: new Date().toISOString(),
    };
  }
}
