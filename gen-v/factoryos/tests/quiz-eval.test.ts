import { describe, it, expect } from "vitest";
import { QuizEvaluator } from "../eval/quiz-eval";

describe("FactoryOS — Quiz Guardian Benchmark Evaluation Suite", () => {
  it("executes the 50-case benchmark dataset and reports metrics", async () => {
    const report = await QuizEvaluator.runEvaluation();

    console.log("=================================================");
    console.log("FACTORYOS QUIZ GUARDIAN SEMANTIC EVALUATION BENCHMARK");
    console.log("=================================================");
    console.log(`Total Dataset Cases: ${report.totalCases}`);
    console.log(`Factual Support Accuracy: ${(report.factualSupportAccuracy * 100).toFixed(1)}%`);
    console.log(`Contradiction Precision:  ${(report.contradictionPrecision * 100).toFixed(1)}%`);
    console.log(`Contradiction Recall:     ${(report.contradictionRecall * 100).toFixed(1)}%`);
    console.log(`Semantic Ambiguity Prec:  ${(report.semanticAmbiguityPrecision * 100).toFixed(1)}%`);
    console.log(`Semantic Ambiguity Rec:   ${(report.semanticAmbiguityRecall * 100).toFixed(1)}%`);
    console.log(`Multiple Answer Det Rate: ${(report.multipleAnswerDetectionRate * 100).toFixed(1)}%`);
    console.log(`No Answer Det Rate:       ${(report.unsupportedAnswerDetectionRate * 100).toFixed(1)}%`);
    console.log(`Decision Accuracy:        ${(report.decisionAccuracy * 100).toFixed(1)}%`);
    console.log("=================================================");

    expect(report.totalCases).toBeGreaterThanOrEqual(50);
    expect(report.contradictionRecall).toBeGreaterThanOrEqual(0.85);
    expect(report.decisionAccuracy).toBeGreaterThanOrEqual(0.75);
  }, 60000);
});
