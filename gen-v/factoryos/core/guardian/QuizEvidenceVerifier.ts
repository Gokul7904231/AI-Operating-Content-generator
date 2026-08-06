import { GeneratedQuizOutput, QuizQuestionItem } from "../adapters/QuizGeneratorAdapter";
import { HybridRetrieverImpl } from "../rag/hybrid/HybridRetrieverImpl";
import { EvidencePack } from "../rag/hybrid/HybridContracts";
import { FactualEntailmentProvider, EntailmentResult } from "./nli/NLIContracts";
import { LocalNLIProvider } from "./nli/LocalNLIProvider";
import { ClaimConstructor } from "./nli/ClaimConstructor";

export interface QuestionFactualityCheck {
  questionIndex: number;
  questionText: string;
  answerText: string;
  hypothesis: string;
  status: "SUPPORTED" | "CONTRADICTION" | "NEUTRAL" | "INSUFFICIENT_EVIDENCE" | "CONFLICTING_EVIDENCE";
  score: number; // 0 to 1
  evidencePack?: EvidencePack;
  nliResult?: EntailmentResult;
  reason?: string;
}

export interface QuizFactualityCheckResult {
  overallFactualityScore: number;
  isFullyGrounded: boolean;
  questionChecks: QuestionFactualityCheck[];
  evidencePacksByQuestion: EvidencePack[];
  hasContradictions: boolean;
  hasInsufficientEvidence: boolean;
}

export class QuizEvidenceVerifier {
  private retriever: HybridRetrieverImpl;
  private nliProvider: FactualEntailmentProvider;

  constructor(options?: {
    retriever?: HybridRetrieverImpl;
    nliProvider?: FactualEntailmentProvider;
  }) {
    this.retriever = options?.retriever ?? new HybridRetrieverImpl();
    this.nliProvider = options?.nliProvider ?? new LocalNLIProvider();
  }

  async seedEvidenceCorpus(
    documents: Array<{ id: string; content: string; metadata?: Record<string, unknown> }>
  ): Promise<void> {
    await this.retriever.ingest(documents);
  }

  async verifyFactuality(quiz: GeneratedQuizOutput): Promise<QuizFactualityCheckResult> {
    const questions = quiz.questions || [];
    const questionChecks: QuestionFactualityCheck[] = [];
    const evidencePacksByQuestion: EvidencePack[] = [];

    let hasContradictions = false;
    let hasInsufficientEvidence = false;

    for (let idx = 0; idx < questions.length; idx++) {
      const q: QuizQuestionItem = questions[idx];
      const hypothesis = ClaimConstructor.constructHypothesis(q.question, q.answer);
      const query = `${quiz.title} ${q.question} ${q.answer}`;

      let evidencePack: EvidencePack;
      try {
        evidencePack = await this.retriever.retrieve(query, { topK: 3 });
      } catch (err) {
        evidencePack = { query: "", items: [], vectorCount: 0, graphCount: 0, fusionMethod: "linear_fusion", durationMs: 0 };
      }

      evidencePacksByQuestion.push(evidencePack);

      // EMPTY CORPUS POLICY: No self-consistency score inflation!
      if (!evidencePack.items || evidencePack.items.length === 0) {
        hasInsufficientEvidence = true;
        questionChecks.push({
          questionIndex: idx,
          questionText: q.question,
          answerText: q.answer,
          hypothesis,
          status: "INSUFFICIENT_EVIDENCE",
          score: 0.40,
          evidencePack,
          reason: "No authoritative evidence found in RAG corpus.",
        });
        continue;
      }

      // MULTI-CHUNK CONSERVATIVE AGGREGATION
      let foundEntailment = false;
      let foundContradiction = false;
      let highestEntailmentConf = 0;
      let highestContradictionConf = 0;
      let bestNliResult: EntailmentResult | undefined;

      for (const item of evidencePack.items) {
        // RAG evidence is treated strictly as DATA (prompt injection text cannot alter control flow)
        const chunkContent = String(item.content ?? "");
        const nliRes = await this.nliProvider.evaluate(chunkContent, hypothesis);

        if (nliRes.label === "CONTRADICTION" && nliRes.confidence >= 0.60) {
          foundContradiction = true;
          if (nliRes.confidence > highestContradictionConf) {
            highestContradictionConf = nliRes.confidence;
            bestNliResult = nliRes;
          }
        } else if (nliRes.label === "ENTAILMENT" && nliRes.confidence >= 0.65) {
          foundEntailment = true;
          if (nliRes.confidence > highestEntailmentConf) {
            highestEntailmentConf = nliRes.confidence;
            bestNliResult = nliRes;
          }
        } else if (!bestNliResult) {
          bestNliResult = nliRes;
        }
      }

      if (foundContradiction && foundEntailment) {
        hasContradictions = true;
        questionChecks.push({
          questionIndex: idx,
          questionText: q.question,
          answerText: q.answer,
          hypothesis,
          status: "CONFLICTING_EVIDENCE",
          score: 0.20,
          evidencePack,
          nliResult: bestNliResult,
          reason: "Conflicting evidence: both entailment and contradiction retrieved.",
        });
      } else if (foundContradiction) {
        hasContradictions = true;
        questionChecks.push({
          questionIndex: idx,
          questionText: q.question,
          answerText: q.answer,
          hypothesis,
          status: "CONTRADICTION",
          score: 0.0,
          evidencePack,
          nliResult: bestNliResult,
          reason: `Strong contradiction found in retrieved evidence: ${bestNliResult?.reason}`,
        });
      } else if (foundEntailment) {
        questionChecks.push({
          questionIndex: idx,
          questionText: q.question,
          answerText: q.answer,
          hypothesis,
          status: "SUPPORTED",
          score: 1.0,
          evidencePack,
          nliResult: bestNliResult,
          reason: `Supported by evidence (${bestNliResult?.reason})`,
        });
      } else {
        hasInsufficientEvidence = true;
        questionChecks.push({
          questionIndex: idx,
          questionText: q.question,
          answerText: q.answer,
          hypothesis,
          status: "NEUTRAL",
          score: 0.50,
          evidencePack,
          nliResult: bestNliResult,
          reason: "Retrieved evidence is neutral / insufficient to verify claim.",
        });
      }
    }

    const totalScore = questionChecks.reduce((acc, c) => acc + c.score, 0);
    const overallFactualityScore = questionChecks.length > 0 ? totalScore / questionChecks.length : 1.0;
    const isFullyGrounded = overallFactualityScore >= 0.70 && !hasContradictions;

    return {
      overallFactualityScore,
      isFullyGrounded,
      questionChecks,
      evidencePacksByQuestion,
      hasContradictions,
      hasInsufficientEvidence,
    };
  }
}
