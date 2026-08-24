/**
 * FactoryOS Quiz Allocation & Reverification Tests
 */

import { describe, it, expect } from "vitest";
import { QuizOrchestrator } from "../../lib/quiz/QuizOrchestrator";

describe("Quiz Multi-Topic Equal Allocation & Reverification", () => {
  it("01: Allocates 6 questions equally across 3 topics (2/2/2)", () => {
    const topics = ["Space Exploration", "Black Holes", "Mars"];
    const allocations = QuizOrchestrator.calculateEqualAllocation(topics, 6);

    expect(allocations.length).toBe(3);
    expect(allocations[0].questionBudget).toBe(2);
    expect(allocations[1].questionBudget).toBe(2);
    expect(allocations[2].questionBudget).toBe(2);

    const total = allocations.reduce((acc, a) => acc + a.questionBudget, 0);
    expect(total).toBe(6);
  });

  it("02: Allocates 7 questions across 3 topics deterministically (3/2/2)", () => {
    const topics = ["Space", "Black Holes", "Mars"];
    const allocations = QuizOrchestrator.calculateEqualAllocation(topics, 7);

    expect(allocations[0].questionBudget).toBe(3);
    expect(allocations[1].questionBudget).toBe(2);
    expect(allocations[2].questionBudget).toBe(2);

    const total = allocations.reduce((acc, a) => acc + a.questionBudget, 0);
    expect(total).toBe(7);
  });

  it("03: Allocates 5 questions across 3 topics deterministically (2/2/1)", () => {
    const topics = ["Space", "Black Holes", "Mars"];
    const allocations = QuizOrchestrator.calculateEqualAllocation(topics, 5);

    expect(allocations[0].questionBudget).toBe(2);
    expect(allocations[1].questionBudget).toBe(2);
    expect(allocations[2].questionBudget).toBe(1);

    const total = allocations.reduce((acc, a) => acc + a.questionBudget, 0);
    expect(total).toBe(5);
  });

  it("04: Enforces N <= Q constraint (rejects if topicCount > questionCount)", () => {
    const fiveTopics = ["Topic A", "Topic B", "Topic C", "Topic D", "Topic E"];
    expect(() => QuizOrchestrator.calculateEqualAllocation(fiveTopics, 3)).toThrow(
      /Topic count \(5\) cannot exceed total questions \(3\)/
    );
  });

  it("05: Question edit bumps revision number and resets verificationStatus to PENDING", () => {
    const initialQuestion = {
      questionId: "q1",
      revision: 1,
      question: "What is the capital of France?",
      options: ["Paris", "Lyon", "Marseille"],
      answer: "Paris",
      verificationStatus: "SUPPORTED",
      score: 1.0,
      evidence: [{ sourceId: "wiki_paris" }],
    };

    const edited = QuizOrchestrator.markQuestionEdited({
      ...initialQuestion,
      question: "What is the largest city in France?",
    });

    expect(edited.revision).toBe(2);
    expect(edited.verificationStatus).toBe("PENDING");
    expect(edited.evidence).toEqual([]);
    expect(edited.score).toBeUndefined();
  });
});
