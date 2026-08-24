export class ClaimConstructor {
  /**
   * Constructs a structured, declarative factual hypothesis statement from a question and candidate option/answer.
   * e.g., Question: "What is the capital of France?", Option: "Paris"
   * -> 'The answer for "What is the capital of France?" is "Paris".'
   */
  static constructHypothesis(question: string, candidate: string): string {
    const cleanQ = String(question ?? "").trim().replace(/\?$/, "");
    const cleanCand = String(candidate ?? "").trim();
    if (!cleanQ || !cleanCand) return "";

    return `The answer for "${cleanQ}" is "${cleanCand}".`;
  }
}
