import { describe, it, expect } from "vitest";
import { QuizGeneratorAdapter } from "../core/adapters/QuizGeneratorAdapter";
import { QuizOutputValidator } from "../core/guardian/QuizOutputValidator";
import { QuizDuplicateDetector } from "../core/guardian/QuizDuplicateDetector";
import { QuizAmbiguityDetector } from "../core/guardian/QuizAmbiguityDetector";
import { QuizEvidenceVerifier } from "../core/guardian/QuizEvidenceVerifier";
import { QuizGuardian } from "../core/guardian/QuizGuardian";
import { QuizProductionTelemetry } from "../core/telemetry/QuizProductionTelemetry";
import execSync from "child_process";

describe("FactoryOS v0.1 — Frozen Quiz Generator Integration & Guardian Suite", () => {
  const sampleValidQuiz = {
    contentType: "QUIZ_SHORTS" as const,
    hook: "Only 1% of geography buffs get Question 3 right!",
    questions: [
      {
        difficulty: "easy" as const,
        question: "What is the capital of France?",
        options: ["Paris", "Lyon", "Marseille"],
        answer: "Paris",
        explanation: "Paris has been the capital of France since 987 AD.",
      },
      {
        difficulty: "medium" as const,
        question: "Which river flows through Paris?",
        options: ["Thames", "Seine", "Danube"],
        answer: "Seine",
        explanation: "The Seine river bisects Paris into the Left and Right banks.",
      },
      {
        difficulty: "hard" as const,
        question: "In what year was the Eiffel Tower completed?",
        options: ["1889", "1901", "1789"],
        answer: "1889",
        explanation: "The Eiffel Tower was completed in 1889 for the Exposition Universelle.",
      },
    ],
    title: "France Geography Quiz",
    description: "Test your knowledge of French geography and history.",
    hashtags: ["quiz", "france", "trivia"],
    renderProfile: "FAST_QUIZ",
    estimatedDuration: 60,
    rawPayload: {},
  };

  it("QuizOutputValidator: passes valid quiz structure and detects missing fields", () => {
    const validRes = QuizOutputValidator.validate(sampleValidQuiz);
    expect(validRes.valid).toBe(true);
    expect(validRes.issues.length).toBe(0);

    const malformedQuiz = {
      ...sampleValidQuiz,
      questions: [
        {
          difficulty: "easy" as const,
          question: "",
          options: ["Paris"],
          answer: "",
          explanation: "",
        },
      ],
    };
    const invalidRes = QuizOutputValidator.validate(malformedQuiz, 3);
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.issues.some((i) => i.code === "INSUFFICIENT_QUESTIONS")).toBe(true);
  });

  it("QuizDuplicateDetector: identifies duplicate questions, options, and negative constraints", () => {
    const dupQuiz = {
      ...sampleValidQuiz,
      questions: [
        sampleValidQuiz.questions[0],
        sampleValidQuiz.questions[0], // Exact duplicate question
        {
          difficulty: "medium" as const,
          question: "What is the capital of Japan?",
          options: ["Tokyo", "Tokyo", "Kyoto"], // Duplicate option
          answer: "Tokyo",
          explanation: "Tokyo is Japan's capital.",
        },
      ],
    };

    const res = QuizDuplicateDetector.detect(dupQuiz, ["capital of France"]);
    expect(res.hasDuplicates).toBe(true);
    expect(res.duplicates.some((d) => d.type === "INTERNAL_DUPLICATE_QUESTION")).toBe(true);
    expect(res.duplicates.some((d) => d.type === "INTERNAL_DUPLICATE_OPTION")).toBe(true);
    expect(res.duplicates.some((d) => d.type === "NEGATIVE_CONSTRAINT_MATCH")).toBe(true);
  });

  it("QuizAmbiguityDetector: flags questions where answer is missing from options or positional phrasing", () => {
    const ambQuiz = {
      ...sampleValidQuiz,
      questions: [
        {
          difficulty: "easy" as const,
          question: "Which landmark is in Paris?",
          options: ["Eiffel Tower", "Colosseum", "All of the above"],
          answer: "Louvre", // Answer not in options
          explanation: "The Louvre is in Paris.",
        },
      ],
    };

    const res = QuizAmbiguityDetector.detect(ambQuiz);
    expect(res.hasAmbiguity).toBe(true);
    expect(res.issues.some((i) => i.code === "ANSWER_NOT_IN_OPTIONS")).toBe(true);
    expect(res.issues.some((i) => i.code === "TRIVIAL_OPTION_PATTERN")).toBe(true);
  });

  it("QuizEvidenceVerifier: scores factuality against RAG evidence", async () => {
    const verifier = new QuizEvidenceVerifier();
    await verifier.seedEvidenceCorpus([
      {
        id: "doc_france",
        content: "Paris is the capital of France. The Seine river flows through Paris. The Eiffel Tower was completed in 1889.",
      },
    ]);

    const res = await verifier.verifyFactuality(sampleValidQuiz);
    expect(res.overallFactualityScore).toBeGreaterThanOrEqual(0.70);
    expect(res.isFullyGrounded).toBe(true);
  });

  it("QuizGuardian: makes PASS decision on pristine quiz", async () => {
    const guardian = new QuizGuardian();
    await guardian["evidenceVerifier"].seedEvidenceCorpus([
      { id: "doc1", content: "Paris is the capital of France. The Seine river flows through Paris. The Eiffel Tower was completed in 1889." }
    ]);
    const report = await guardian.evaluate(sampleValidQuiz);
    console.log("PASS TEST SUMMARY REASONS:", report.summaryReasons);

    expect(report.decision).toBe("PASS");
    expect(report.overallScore).toBeGreaterThanOrEqual(0.75);
    expect(report.structureScore).toBe(1.0);
  });

  it("QuizGuardian: makes REPAIR decision when non-fatal defects are detected", async () => {
    const guardian = new QuizGuardian();
    const minorDefectQuiz = {
      ...sampleValidQuiz,
      questions: [
        sampleValidQuiz.questions[0],
        sampleValidQuiz.questions[0], // duplicate question triggers REPAIR
        sampleValidQuiz.questions[2],
      ],
    };

    const report = await guardian.evaluate(minorDefectQuiz);
    expect(report.decision).toBe("REPAIR");
    expect(report.duplicateCheck.hasDuplicates).toBe(true);
  });

  it("QuizGuardian: makes REJECT decision on severe structural failure", async () => {
    const guardian = new QuizGuardian();
    const brokenQuiz = {
      ...sampleValidQuiz,
      hook: "",
      questions: [],
    };

    const report = await guardian.evaluate(brokenQuiz, { minQuestions: 3 });
    expect(report.decision).toBe("REJECT");
    expect(report.overallScore).toBeLessThan(0.40);
  });

  it("QuizProductionTelemetry: records metrics and trace spans cleanly", async () => {
    const guardian = new QuizGuardian();
    const report = await guardian.evaluate(sampleValidQuiz);
    const telemetry = new QuizProductionTelemetry();

    expect(() => telemetry.recordEvaluation("run_test_123", report)).not.toThrow();
  });

  it("QuizGeneratorAdapter: successfully delegates to scriptAgent without modifying frozen generator", async () => {
    const { AIProviderRegistry } = await import("../../ai/capability-registry");

    const mockPlugin: any = {
      id: "mock_quiz_provider",
      name: "Mock Quiz Provider",
      manifest: { id: "mock_quiz_provider", name: "Mock", version: "1.0", author: "Test", description: "", dependencies: [], capabilities: ["SCRIPT"] },
      discoverModels: async () => [{ id: "mock-model", name: "Mock", provider: "mock_quiz_provider", capabilities: ["SCRIPT"], contextWindow: 4096, costInput: 0, costOutput: 0, speed: 100, health: 1.0, availability: true, isLocal: true }],
      health: async () => true,
      priority: () => 100,
      execute: async () =>
        JSON.stringify({
          contentType: "QUIZ_SHORTS",
          hook: "Only 1% of space enthusiasts know Question 6!",
          questions: [
            { difficulty: "easy", question: "What is the red planet?", options: ["Mars", "Venus", "Jupiter"], answer: "Mars", explanation: "Mars appears red due to iron oxide." },
            { difficulty: "medium", question: "First human in space?", options: ["Yuri Gagarin", "Neil Armstrong", "Buzz Aldrin"], answer: "Yuri Gagarin", explanation: "Yuri Gagarin orbited Earth in 1961." },
            { difficulty: "hard", question: "Distance to Moon in km?", options: ["384,400 km", "150,000 km", "500,000 km"], answer: "384,400 km", explanation: "Average distance is 384,400 km." },
            { difficulty: "easy", question: "Largest planet?", options: ["Jupiter", "Saturn", "Neptune"], answer: "Jupiter", explanation: "Jupiter is the largest planet." },
            { difficulty: "medium", question: "Which galaxy is Earth in?", options: ["Milky Way", "Andromeda", "Triangulum"], answer: "Milky Way", explanation: "Earth is in the Milky Way." },
            { difficulty: "hard", question: "Speed of light in m/s?", options: ["299,792,458", "150,000,000", "3,000,000"], answer: "299,792,458", explanation: "Speed of light is 299,792,458 m/s." },
          ],
          title: "Space Quiz",
          description: "Trivia about space",
          hashtags: ["space", "quiz"],
          renderProfile: "FAST_QUIZ",
          estimatedDuration: 60,
        }),
      status: () => ({ state: "ONLINE", latency: 10, avgResponseTime: 10, errorRate: 0, totalCost: { tokensInput: 0, tokensOutput: 0, estimatedUSD: 0, currency: "USD", pricingSource: "free", lastUpdated: Date.now() }, retries: 0, retryRate: 0, quotaRemaining: -1, rateLimitLimit: -1, rateLimitRemaining: -1, rateLimitReset: 0, jsonReliability: 1.0, lastChecked: Date.now() }),
    };

    AIProviderRegistry.registerPlugin(mockPlugin);

    const output = await QuizGeneratorAdapter.generateQuiz({
      topic: "Space Exploration",
      style: "medium",
      durationSeconds: 60,
      provider: "mock_quiz_provider" as any,
    });

    expect(output.contentType).toBe("QUIZ_SHORTS");
    expect(output.questions.length).toBe(6);
    expect(output.hook.length).toBeGreaterThan(0);
    expect(output.questions[0].answer).toBe("Mars");
  });
});
