export type EntailmentLabel = "ENTAILMENT" | "NEUTRAL" | "CONTRADICTION";

export interface EntailmentResult {
  label: EntailmentLabel;
  confidence: number; // 0.0 to 1.0
  engine: "HEURISTIC_NLI" | "TRANSFORMER_NLI";
  modelName?: string;
  modelVersion?: string;
  reason?: string;
}

export interface FactualEntailmentProvider {
  /**
   * Evaluates whether the premise supports, contradicts, or is neutral to the hypothesis.
   * @param premise The retrieved reference evidence text
   * @param hypothesis The generated claim hypothesis (e.g., "The answer to 'What is the capital of France?' is Paris.")
   */
  evaluate(premise: string, hypothesis: string): Promise<EntailmentResult>;
}
