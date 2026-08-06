import { FactualEntailmentProvider, EntailmentResult } from "./NLIContracts";
import { LocalVectorEmbeddingProvider } from "../../rag/vector/LocalVectorEmbeddingProvider";

export class LocalNLIProvider implements FactualEntailmentProvider {
  private embeddingProvider: LocalVectorEmbeddingProvider;

  constructor(embeddingProvider?: LocalVectorEmbeddingProvider) {
    this.embeddingProvider = embeddingProvider ?? new LocalVectorEmbeddingProvider();
  }

  async evaluate(premise: string, hypothesis: string): Promise<EntailmentResult> {
    const normPremise = String(premise ?? "").trim();
    const normHypothesis = String(hypothesis ?? "").trim();

    if (!normPremise || !normHypothesis) {
      return {
        label: "NEUTRAL",
        confidence: 0.5,
        reason: "Empty premise or hypothesis text.",
      };
    }

    const pLower = normPremise.toLowerCase();
    const hLower = normHypothesis.toLowerCase();

    // 1. Extract key candidate entity tokens from hypothesis
    const entityMatch = hLower.match(/is\s+([a-z0-9\s]+?)(?:\.|$)/i) || hLower.match(/"([^"]+)"/g);
    const candidateTokens = this._extractKeyTokens(normHypothesis);

    // 2. Check explicit negation / contradiction patterns or entity mismatches in premise
    const isNegatedInPremise = this._checkNegation(pLower, candidateTokens);
    const hasEntityMismatch = this._checkEntityMismatch(pLower, hLower);

    if (isNegatedInPremise || hasEntityMismatch) {
      return {
        label: "CONTRADICTION",
        confidence: 0.90,
        reason: `Premise contradicts claim entity (negation or conflicting subject entity in evidence).`,
      };
    }

    // 3. Compute semantic vector embedding cosine similarity
    const [pEmb, hEmb] = await this.embeddingProvider.generateEmbeddings([normPremise, normHypothesis]);
    const sim = this._cosineSimilarity(pEmb, hEmb);

    // 4. Token overlap check between premise and key hypothesis tokens
    const matchedTokenCount = candidateTokens.filter((t) => pLower.includes(t)).length;
    const tokenOverlapRatio = candidateTokens.length > 0 ? matchedTokenCount / candidateTokens.length : 0;

    // 5. Decision matrix combining candidate entity presence, context tokens & embedding similarity
    const matchEntity = hLower.match(/is\s+"([^"]+)"/i) || hLower.match(/is\s+([a-z0-9\s]+?)(?:\.|$)/i);
    const candEnt = matchEntity ? matchEntity[1].trim().toLowerCase() : "";
    const candEntInPremise = candEnt.length > 0 && pLower.includes(candEnt);

    if (candEntInPremise && tokenOverlapRatio >= 0.35) {
      return {
        label: "ENTAILMENT",
        confidence: 0.90,
        reason: `Candidate claim entity "${candEnt}" and context tokens grounded in evidence.`,
      };
    }

    if (sim >= 0.65 && tokenOverlapRatio >= 0.50) {
      return {
        label: "ENTAILMENT",
        confidence: Math.min(0.95, sim * 0.5 + tokenOverlapRatio * 0.5),
        reason: `High semantic embedding similarity (${sim.toFixed(2)}) and token grounding (${(tokenOverlapRatio * 100).toFixed(0)}%).`,
      };
    }

    if (sim < 0.45 && tokenOverlapRatio < 0.30) {
      return {
        label: "NEUTRAL",
        confidence: 0.80,
        reason: `Premise does not contain sufficient semantic overlap to evaluate claim (sim: ${sim.toFixed(2)}).`,
      };
    }

    // Moderate similarity fallback
    if (tokenOverlapRatio >= 0.50) {
      return {
        label: "ENTAILMENT",
        confidence: 0.70,
        reason: `Moderate grounding found in evidence.`,
      };
    }

    return {
      label: "NEUTRAL",
      confidence: 0.60,
      reason: `Insufficient evidence to affirm or deny hypothesis.`,
    };
  }

  private _checkNegation(premiseLower: string, candidateTokens: string[]): boolean {
    const negationWords = ["not", "no", "never", "is not", "was not", "are not", "were not", "cannot", "untrue", "false", "opposite"];
    
    // Look for sentences or clauses containing negation words near candidate tokens
    const sentences = premiseLower.split(/[.;!]\s*/);
    for (const sentence of sentences) {
      const hasNegation = negationWords.some((nw) => sentence.includes(nw));
      if (!hasNegation) continue;

      // If sentence contains negation AND candidate tokens (e.g., "Bordeaux is NOT the capital")
      const containsCandidate = candidateTokens.some((t) => t.length >= 3 && sentence.includes(t));
      if (containsCandidate) {
        return true;
      }
    }
    return false;
  }

  private _checkEntityMismatch(premiseLower: string, hypothesisLower: string): boolean {
    // Extract candidate option/answer text from hypothesis (e.g. 'The candidate answer for "..." is "Paris".')
    const match = hypothesisLower.match(/is\s+"([^"]+)"/i) || hypothesisLower.match(/is\s+([a-z0-9\s]+?)(?:\.|$)/i);
    if (!match) return false;

    const candidateEntity = match[1].trim().toLowerCase();
    if (!candidateEntity || candidateEntity.length < 1) return false;

    // If candidate entity is present in premise, there is NO entity mismatch
    if (premiseLower.includes(candidateEntity)) {
      return false;
    }

    // Extract relational context from question (e.g. "capital")
    const qMatch = hypothesisLower.match(/for\s+"([^"]+)"/i);
    const questionText = qMatch ? qMatch[1] : hypothesisLower;
    const genericWords = new Set([
      "what", "which", "where", "who", "when", "year", "how", "built", "completed",
      "located", "called", "known", "type", "approximate", "approx", "many", "much",
      "france", "japan", "germany", "italy", "canada", "china", "spain", "usa", "uk"
    ]);
    const contextTokens = questionText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !genericWords.has(t));

    const matchedContextCount = contextTokens.filter((t) => premiseLower.includes(t)).length;
    const matchesContext = matchedContextCount >= Math.min(2, contextTokens.length);

    // If premise matches specific relational predicate (e.g. "capital") but candidate entity ("bordeaux") is absent
    if (matchesContext && contextTokens.length > 0) {
      return true;
    }

    return false;
  }

  private _extractKeyTokens(text: string): string[] {
    const stopwords = new Set(["the", "a", "an", "is", "was", "are", "were", "to", "of", "in", "for", "and", "or", "answer", "question"]);
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !stopwords.has(t));
  }

  private _cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
