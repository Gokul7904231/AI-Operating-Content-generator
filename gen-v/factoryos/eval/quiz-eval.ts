import fs from "fs";
import path from "path";
import { QuizGuardian } from "../core/guardian/QuizGuardian";
import { QuizEvidenceVerifier } from "../core/guardian/QuizEvidenceVerifier";
import { GeneratedQuizOutput } from "../core/adapters/QuizGeneratorAdapter";

export interface QuizEvalMetricReport {
  totalCases: number;
  factualSupportAccuracy: number;
  contradictionPrecision: number;
  contradictionRecall: number;
  semanticAmbiguityPrecision: number;
  semanticAmbiguityRecall: number;
  multipleAnswerDetectionRate: number;
  unsupportedAnswerDetectionRate: number;
  decisionAccuracy: number;
  details: Array<{
    id: string;
    category: string;
    expectedFactuality: string;
    actualFactuality: string;
    expectedAmbiguity: string;
    actualAmbiguity: string;
    expectedDecision: string;
    actualDecision: string;
    pass: boolean;
  }>;
}

export class QuizEvaluator {
  static async runEvaluation(datasetPath?: string): Promise<QuizEvalMetricReport> {
    const defaultPath = fs.existsSync(path.join(process.cwd(), "gen-v", "factoryos", "benchmarks", "quiz_semantic_eval_dataset.json"))
      ? path.join(process.cwd(), "gen-v", "factoryos", "benchmarks", "quiz_semantic_eval_dataset.json")
      : path.join(process.cwd(), "factoryos", "benchmarks", "quiz_semantic_eval_dataset.json");
    const file = datasetPath ?? defaultPath;
    const raw = fs.readFileSync(file, "utf-8");
    const dataset: Array<any> = JSON.parse(raw);

    let factualCorrect = 0;
    let contradictionTP = 0;
    let contradictionFP = 0;
    let contradictionFN = 0;

    let ambiguityTP = 0;
    let ambiguityFP = 0;
    let ambiguityFN = 0;

    let multipleAnswerTarget = 0;
    let multipleAnswerDetected = 0;

    let unsupportedTarget = 0;
    let unsupportedDetected = 0;

    let decisionCorrect = 0;

    const details: QuizEvalMetricReport["details"] = [];

    for (const testCase of dataset) {
      const mockQuiz: GeneratedQuizOutput = {
        contentType: "QUIZ_SHORTS",
        hook: "Benchmark Hook",
        questions: [
          {
            difficulty: "medium",
            question: testCase.question,
            options: testCase.options,
            answer: testCase.answer,
            explanation: testCase.explanation,
          },
        ],
        title: "Benchmark Quiz",
        description: "Benchmark",
        hashtags: ["eval"],
        renderProfile: "FAST_QUIZ",
        estimatedDuration: 30,
        rawPayload: {},
      };

      const verifier = new QuizEvidenceVerifier();
      await verifier.seedEvidenceCorpus([
        { id: `doc_${testCase.id}`, content: testCase.evidence },
      ]);

      const guardian = new QuizGuardian({ evidenceVerifier: verifier });
      const report = await guardian.evaluate(mockQuiz, { minQuestions: 1 });

      const factCheck = report.factualityCheck.questionChecks[0];
      const actualFactuality = factCheck ? factCheck.status : "UNKNOWN";

      // Detect actual ambiguity codes
      const semIssues = report.semanticOptionValidation?.issues || [];
      let actualAmbiguity = "NONE";
      if (semIssues.some((i) => i.code === "EQUIVALENT_OPTIONS")) actualAmbiguity = "EQUIVALENT_OPTIONS";
      else if (semIssues.some((i) => i.code === "SEMANTIC_EQUIVALENT_OPTIONS")) actualAmbiguity = "SEMANTIC_EQUIVALENT_OPTIONS";
      else if (semIssues.some((i) => i.code === "MULTIPLE_VALID_ANSWERS")) actualAmbiguity = "MULTIPLE_VALID_ANSWERS";
      else if (semIssues.some((i) => i.code === "NO_SUPPORTED_ANSWER")) actualAmbiguity = "NO_SUPPORTED_ANSWER";

      const actualDecision = report.decision;

      const isFactualityMatch = actualFactuality === testCase.expectedFactuality;
      if (isFactualityMatch) factualCorrect++;

      // Contradiction metrics
      if (testCase.expectedFactuality === "CONTRADICTION" && actualFactuality === "CONTRADICTION") contradictionTP++;
      else if (testCase.expectedFactuality !== "CONTRADICTION" && actualFactuality === "CONTRADICTION") contradictionFP++;
      else if (testCase.expectedFactuality === "CONTRADICTION" && actualFactuality !== "CONTRADICTION") contradictionFN++;

      // Ambiguity metrics
      const isAmbiguousExpected = testCase.expectedAmbiguity !== "NONE";
      const isAmbiguousActual = actualAmbiguity !== "NONE";
      if (isAmbiguousExpected && isAmbiguousActual) ambiguityTP++;
      else if (!isAmbiguousExpected && isAmbiguousActual) ambiguityFP++;
      else if (isAmbiguousExpected && !isAmbiguousActual) ambiguityFN++;

      // Specific detection counters
      if (testCase.expectedAmbiguity === "MULTIPLE_VALID_ANSWERS") {
        multipleAnswerTarget++;
        if (actualAmbiguity === "MULTIPLE_VALID_ANSWERS") multipleAnswerDetected++;
      }

      if (testCase.expectedAmbiguity === "NO_SUPPORTED_ANSWER") {
        unsupportedTarget++;
        if (actualAmbiguity === "NO_SUPPORTED_ANSWER") unsupportedDetected++;
      }

      const isDecisionMatch = actualDecision === testCase.expectedDecision;
      if (isDecisionMatch) decisionCorrect++;

      details.push({
        id: testCase.id,
        category: testCase.category,
        expectedFactuality: testCase.expectedFactuality,
        actualFactuality,
        expectedAmbiguity: testCase.expectedAmbiguity,
        actualAmbiguity,
        expectedDecision: testCase.expectedDecision,
        actualDecision,
        pass: isFactualityMatch && isDecisionMatch,
      });
    }

    const total = dataset.length;
    const factualSupportAccuracy = factualCorrect / total;
    const contradictionPrecision = contradictionTP + contradictionFP > 0 ? contradictionTP / (contradictionTP + contradictionFP) : 1.0;
    const contradictionRecall = contradictionTP + contradictionFN > 0 ? contradictionTP / (contradictionTP + contradictionFN) : 1.0;

    const semanticAmbiguityPrecision = ambiguityTP + ambiguityFP > 0 ? ambiguityTP / (ambiguityTP + ambiguityFP) : 1.0;
    const semanticAmbiguityRecall = ambiguityTP + ambiguityFN > 0 ? ambiguityTP / (ambiguityTP + ambiguityFN) : 1.0;

    const multipleAnswerDetectionRate = multipleAnswerTarget > 0 ? multipleAnswerDetected / multipleAnswerTarget : 1.0;
    const unsupportedAnswerDetectionRate = unsupportedTarget > 0 ? unsupportedDetected / unsupportedTarget : 1.0;
    const decisionAccuracy = decisionCorrect / total;

    return {
      totalCases: total,
      factualSupportAccuracy,
      contradictionPrecision,
      contradictionRecall,
      semanticAmbiguityPrecision,
      semanticAmbiguityRecall,
      multipleAnswerDetectionRate,
      unsupportedAnswerDetectionRate,
      decisionAccuracy,
      details,
    };
  }
}
