import { GeneratedQuizOutput, QuizQuestionItem } from "../../adapters/QuizGeneratorAdapter";
import { LocalVectorEmbeddingProvider } from "../../rag/vector/LocalVectorEmbeddingProvider";
import { FactualEntailmentProvider } from "../nli/NLIContracts";
import { LocalNLIProvider } from "../nli/LocalNLIProvider";
import { ClaimConstructor } from "../nli/ClaimConstructor";
import { EvidencePack } from "../../rag/hybrid/HybridContracts";

export interface SemanticOptionIssue {
  code:
    | "EQUIVALENT_OPTIONS"
    | "SEMANTIC_EQUIVALENT_OPTIONS"
    | "MULTIPLE_VALID_ANSWERS"
    | "NO_SUPPORTED_ANSWER";
  questionIndex: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface SemanticOptionValidationResult {
  hasSemanticAmbiguity: boolean;
  score: number; // 0.0 to 1.0
  issues: SemanticOptionIssue[];
}

export class SemanticOptionValidator {
  private embeddingProvider: LocalVectorEmbeddingProvider;
  private nliProvider: FactualEntailmentProvider;

  constructor(options?: {
    embeddingProvider?: LocalVectorEmbeddingProvider;
    nliProvider?: FactualEntailmentProvider;
  }) {
    this.embeddingProvider = options?.embeddingProvider ?? new LocalVectorEmbeddingProvider();
    this.nliProvider = options?.nliProvider ?? new LocalNLIProvider(this.embeddingProvider);
  }

  async validateQuizOptions(
    quiz: GeneratedQuizOutput,
    evidencePacksByQuestion?: EvidencePack[]
  ): Promise<SemanticOptionValidationResult> {
    const issues: SemanticOptionIssue[] = [];
    const questions = quiz.questions || [];

    for (let qIdx = 0; qIdx < questions.length; qIdx++) {
      const q: QuizQuestionItem = questions[qIdx];
      const rawOptions = q.options || [];

      // LEVEL 1: Cheap Deterministic Normalization
      const normValues = rawOptions.map((opt) => this._normalizeDeterministic(opt));
      const seenNorms = new Map<string, number>();

      for (let optIdx = 0; optIdx < normValues.length; optIdx++) {
        const norm = normValues[optIdx];
        if (seenNorms.has(norm)) {
          const prevIdx = seenNorms.get(norm)!;
          issues.push({
            code: "EQUIVALENT_OPTIONS",
            questionIndex: qIdx,
            message: `Question ${qIdx + 1} options "${rawOptions[prevIdx]}" and "${rawOptions[optIdx]}" are deterministically equivalent.`,
            details: { optionA: rawOptions[prevIdx], optionB: rawOptions[optIdx] },
          });
        } else {
          seenNorms.set(norm, optIdx);
        }
      }

      // LEVEL 2: Semantic Embedding Similarity (Synonyms / Paraphrases)
      if (rawOptions.length > 1) {
        // Fast lexical synonym check (covers hash-fallback 0-sim case like USA/United States)
        for (let i = 0; i < rawOptions.length; i++) {
          for (let j = i + 1; j < rawOptions.length; j++) {
            if (this._areLexicallySynonymous(rawOptions[i], rawOptions[j])) {
              issues.push({
                code: "SEMANTIC_EQUIVALENT_OPTIONS",
                questionIndex: qIdx,
                message: `Question ${qIdx + 1} options "${rawOptions[i]}" and "${rawOptions[j]}" are lexically synonymous.`,
                details: { optionA: rawOptions[i], optionB: rawOptions[j], similarity: 1.0 },
              });
            }
          }
        }
        // Embedding similarity — skip pure-numeric options to avoid hash-collision false positives (e.g. 1889 vs 1900)
        const embeddings = await this.embeddingProvider.generateEmbeddings(rawOptions);
        for (let i = 0; i < rawOptions.length; i++) {
          for (let j = i + 1; j < rawOptions.length; j++) {
            const a = String(rawOptions[i] ?? "").trim();
            const b = String(rawOptions[j] ?? "").trim();
            const isNumericPair = /^\d+(\.\d+)?$/.test(a) && /^\d+(\.\d+)?$/.test(b);
            if (isNumericPair) continue;
            if (this._areLexicallySynonymous(a, b)) continue; // already reported
            const sim = this._cosineSimilarity(embeddings[i], embeddings[j]);
            if (sim >= 0.82) {
              issues.push({
                code: "SEMANTIC_EQUIVALENT_OPTIONS",
                questionIndex: qIdx,
                message: `Question ${qIdx + 1} options "${rawOptions[i]}" and "${rawOptions[j]}" have high semantic similarity (${sim.toFixed(2)}).`,
                details: { optionA: rawOptions[i], optionB: rawOptions[j], similarity: sim },
              });
            }
          }
        }
      }

      // LEVEL 3: NLI Evidence Validation for Multiple/Zero Correct Answers
      const evidencePack = evidencePacksByQuestion ? evidencePacksByQuestion[qIdx] : undefined;
      if (evidencePack && evidencePack.items.length > 0) {
        const evidenceText = evidencePack.items.map((item) => item.content).join(" ");
        const supportedOptions: string[] = [];

        for (const option of rawOptions) {
          const hyp = ClaimConstructor.constructHypothesis(q.question, option);
          const nliRes = await this.nliProvider.evaluate(evidenceText, hyp);
          if (nliRes.label === "ENTAILMENT" && nliRes.confidence >= 0.65) {
            supportedOptions.push(option);
          }
        }

        if (supportedOptions.length > 1) {
          issues.push({
            code: "MULTIPLE_VALID_ANSWERS",
            questionIndex: qIdx,
            message: `Question ${qIdx + 1} has multiple options supported by evidence: [${supportedOptions.join(", ")}].`,
            details: { supportedOptions },
          });
        } else if (supportedOptions.length === 0) {
          issues.push({
            code: "NO_SUPPORTED_ANSWER",
            questionIndex: qIdx,
            message: `Question ${qIdx + 1} has no options supported by retrieved evidence.`,
          });
        }
      }
    }

    const totalQuestions = Math.max(1, questions.length);
    const score = Math.max(0, 1 - issues.length / totalQuestions);

    return {
      hasSemanticAmbiguity: issues.length > 0,
      score,
      issues,
    };
  }

  private _normalizeDeterministic(opt: string): string {
    let s = String(opt ?? "").trim().toLowerCase();

    // Percentages: "50%" -> "0.5"
    if (s.endsWith("%")) {
      const val = parseFloat(s.replace("%", ""));
      if (!isNaN(val)) return String(val / 100);
    }

    // Basic Fractions: "1/2" -> "0.5", "1/4" -> "0.25", "3/4" -> "0.75"
    if (/^\d+\/\d+$/.test(s)) {
      const [num, den] = s.split("/").map(Number);
      if (den !== 0) return String(num / den);
    }

    // Basic Decimals: "0.50" -> "0.5"
    if (/^\d+\.\d+$/.test(s)) {
      return String(parseFloat(s));
    }

    // Basic Units: "5 km" or "5000 m"
    if (/^\d+\s*km$/.test(s)) {
      const km = parseFloat(s.replace("km", ""));
      return `${km * 1000}m`;
    }

    if (/^\d+\s*m$/.test(s)) {
      return s.replace(/\s+/g, "");
    }

    // Strip punctuation and extra whitespace
    return s.replace(/[^a-z0-9]/g, "");
  }

  private _areLexicallySynonymous(a: string, b: string): boolean {
    const normA = String(a ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const normB = String(b ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!normA || !normB || normA === normB) return false;
    // Curated alias set — extendable without new infra
    const aliases: Record<string, string[]> = {
      usa: ["unitedstates", "unitedstatesofamerica", "america"],
      unitedstates: ["usa", "unitedstatesofamerica", "america"],
      uk: ["unitedkingdom", "britain", "greatbritain"],
      uae: ["unitedarabemirates", "emirates"],
    };
    if (aliases[normA]?.includes(normB) || aliases[normB]?.includes(normA)) return true;
    // Abbreviation expansion: all caps short form matches its long form prefix
    if (normA.length <= 4 && normB.includes(normA) && normB.length > normA.length) {
      // e.g. usa vs unitedstates — already covered, but generic guard for 2-4 char acronyms
      return true;
    }
    if (normB.length <= 4 && normA.includes(normB) && normA.length > normB.length) return true;
    return false;
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
