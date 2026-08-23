/**
 * FactoryOS QuizEvidenceVerifier
 * 
 * Performs NLI-based factual entailment checks on generated quiz claims against
 * independent external evidence chunks.
 * Enforces hard insufficient-evidence policy and detailed EvidencePack provenance.
 */

import { GeneratedQuizOutput, QuizQuestionItem } from "../adapters/QuizGeneratorAdapter";
import { HybridRetrieverImpl } from "../rag/hybrid/HybridRetrieverImpl";
import { EvidencePack } from "../rag/hybrid/HybridContracts";
import { FactualEntailmentProvider, EntailmentResult, EntailmentLabel } from "./nli/NLIContracts";
import { LocalNLIProvider } from "./nli/LocalNLIProvider";
import { ClaimConstructor } from "./nli/ClaimConstructor";
import {
  AuthoritativeExternalDocument,
  EvidenceChunk,
  SourceTrustLevel,
  SourceType,
} from "../rag/external/ExternalEvidenceContracts";

export interface EvidenceItem {
  sourceId: string;
  title: string;
  sourceUrl: string;
  chunkId: string;
  similarity: number;
  sourceTrustLevel: SourceTrustLevel;
  sourceType: SourceType;
  nliLabel: EntailmentLabel;
  nliConfidence: number;
  contentHash: string;
}

export interface QuestionFactualityCheck {
  questionIndex: number;
  questionText: string;
  answerText: string;
  hypothesis: string;
  verdict: "SUPPORTED" | "CONTRADICTION" | "NEUTRAL" | "INSUFFICIENT_EVIDENCE" | "CONFLICTING_EVIDENCE";
  status: "SUPPORTED" | "CONTRADICTION" | "NEUTRAL" | "INSUFFICIENT_EVIDENCE" | "CONFLICTING_EVIDENCE";
  confidence: number;
  score: number; // 0.0 to 1.0
  evidence: EvidenceItem[];
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
  insufficientEvidenceCount: number;
}

export class QuizEvidenceVerifier {
  private retriever: HybridRetrieverImpl;
  private nliProvider: FactualEntailmentProvider;
  private seededCount: number = 0;

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
    this.seededCount = documents.length;
    await this.retriever.ingest(documents);
  }

  async seedEvidenceChunks(chunks: EvidenceChunk[]): Promise<void> {
    this.seededCount = chunks.length;
    const documents = chunks.map((c) => ({
      id: c.chunkId,
      content: c.content,
      metadata: {
        sourceId: c.sourceId,
        title: c.title,
        sourceUrl: c.sourceUrl,
        contentHash: c.contentHash,
        sourceTrustLevel: c.sourceTrustLevel,
        sourceType: c.sourceType,
        chunkIndex: c.chunkIndex,
      },
    }));
    await this.retriever.ingest(documents);
  }

  async verifyFactuality(quiz: GeneratedQuizOutput): Promise<QuizFactualityCheckResult> {
    const questions = quiz.questions || [];
    const questionChecks: QuestionFactualityCheck[] = [];
    const evidencePacksByQuestion: EvidencePack[] = [];

    let hasContradictions = false;
    let hasInsufficientEvidence = false;
    let insufficientEvidenceCount = 0;

    for (let idx = 0; idx < questions.length; idx++) {
      const q: QuizQuestionItem = questions[idx];
      const hypothesis = ClaimConstructor.constructHypothesis(q.question, q.answer);
      const query = `${quiz.title} ${q.question} ${q.answer}`;

      let evidencePack: EvidencePack;
      try {
        evidencePack = await this.retriever.retrieve(query, { topK: 3 });
      } catch {
        evidencePack = { query: "", items: [], vectorCount: 0, graphCount: 0, fusionMethod: "linear_fusion", durationMs: 0 };
      }

      evidencePacksByQuestion.push(evidencePack);

      // 🔒 HARD INSUFFICIENT-EVIDENCE POLICY:
      // If no authoritative evidence was seeded or retrieved, NEVER allow SUPPORTED.
      if (this.seededCount === 0 || !evidencePack.items || evidencePack.items.length === 0) {
        hasInsufficientEvidence = true;
        insufficientEvidenceCount++;
        questionChecks.push({
          questionIndex: idx,
          questionText: q.question,
          answerText: q.answer,
          hypothesis,
          verdict: "INSUFFICIENT_EVIDENCE",
          status: "INSUFFICIENT_EVIDENCE",
          confidence: 0.0,
          score: 0.0,
          evidence: [],
          evidencePack,
          reason: "No authoritative external evidence retrieved for claim verification.",
        });
        continue;
      }

      const evidenceItems: EvidenceItem[] = [];
      let foundEntailment = false;
      let foundContradiction = false;
      let highestEntailmentConf = 0;
      let highestContradictionConf = 0;
      let bestNliResult: EntailmentResult | undefined;

      for (const item of evidencePack.items) {
        const chunkContent = String(item.content ?? "");
        const meta = ((item as any).metadata ?? (item as any).provenance?.metadata ?? {}) as Record<string, any>;
        const nliRes = await this.nliProvider.evaluate(chunkContent, hypothesis);

        const evidenceItem: EvidenceItem = {
          sourceId: String(meta.sourceId || item.id),
          title: String(meta.title || "External Reference"),
          sourceUrl: String(meta.sourceUrl || "https://en.wikipedia.org"),
          chunkId: String(item.id),
          similarity: Number(item.score ?? 0.8),
          sourceTrustLevel: (meta.sourceTrustLevel || "REFERENCE") as SourceTrustLevel,
          sourceType: (meta.sourceType || "WIKIPEDIA") as SourceType,
          nliLabel: nliRes.label,
          nliConfidence: nliRes.confidence,
          contentHash: String(meta.contentHash || ""),
        };
        evidenceItems.push(evidenceItem);

        if (nliRes.label === "CONTRADICTION" && nliRes.confidence >= 0.60) {
          foundContradiction = true;
          if (nliRes.confidence > highestContradictionConf) {
            highestContradictionConf = nliRes.confidence;
            bestNliResult = nliRes;
          }
        } else if (nliRes.label === "ENTAILMENT" && nliRes.confidence >= 0.60) {
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
          verdict: "CONFLICTING_EVIDENCE",
          status: "CONFLICTING_EVIDENCE",
          confidence: highestContradictionConf,
          score: 0.20,
          evidence: evidenceItems,
          evidencePack,
          nliResult: bestNliResult,
          reason: "Conflicting evidence: both entailment and contradiction retrieved from external sources.",
        });
      } else if (foundContradiction) {
        hasContradictions = true;
        questionChecks.push({
          questionIndex: idx,
          questionText: q.question,
          answerText: q.answer,
          hypothesis,
          verdict: "CONTRADICTION",
          status: "CONTRADICTION",
          confidence: highestContradictionConf,
          score: 0.0,
          evidence: evidenceItems,
          evidencePack,
          nliResult: bestNliResult,
          reason: `Contradiction found in external evidence: ${bestNliResult?.reason}`,
        });
      } else if (foundEntailment) {
        questionChecks.push({
          questionIndex: idx,
          questionText: q.question,
          answerText: q.answer,
          hypothesis,
          verdict: "SUPPORTED",
          status: "SUPPORTED",
          confidence: highestEntailmentConf,
          score: 1.0,
          evidence: evidenceItems,
          evidencePack,
          nliResult: bestNliResult,
          reason: `Supported by external evidence (${bestNliResult?.reason})`,
        });
      } else {
        hasInsufficientEvidence = true;
        insufficientEvidenceCount++;
        questionChecks.push({
          questionIndex: idx,
          questionText: q.question,
          answerText: q.answer,
          hypothesis,
          verdict: "NEUTRAL",
          status: "NEUTRAL",
          confidence: 0.5,
          score: 0.50,
          evidence: evidenceItems,
          evidencePack,
          nliResult: bestNliResult,
          reason: "Retrieved external evidence is neutral or insufficient to verify claim.",
        });
      }
    }

    const totalScore = questionChecks.reduce((acc, c) => acc + c.score, 0);
    const overallFactualityScore = questionChecks.length > 0 ? totalScore / questionChecks.length : 0.0;
    const isFullyGrounded = overallFactualityScore >= 0.70 && !hasContradictions && insufficientEvidenceCount === 0;

    return {
      overallFactualityScore,
      isFullyGrounded,
      questionChecks,
      evidencePacksByQuestion,
      hasContradictions,
      hasInsufficientEvidence,
      insufficientEvidenceCount,
    };
  }
}
