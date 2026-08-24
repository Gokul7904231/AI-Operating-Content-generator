/**
 * FactoryOS — External Evidence RAG & Zero-Placeholder Acceptance Test Suite
 * 
 * Verifies:
 * 1. Authoritative External Document Contract (SHA-256, HTTP/HTTPS URLs, Trust Levels)
 * 2. TextChunker Provenance Preservation
 * 3. Rejection of Forbidden Sources (GENERATED_QUIZ, LLM_OUTPUT, factoryos.internal, FALLBACK_CORPUS)
 * 4. Hard Insufficient Evidence Policy (Empty external retrieval => Guardian cannot PASS)
 * 5. Real External Integration Test (Wikipedia retrieval for AI Milestones, chunking, NLI verification)
 */

import { describe, it, expect } from "vitest";
import {
  AuthoritativeExternalDocument,
  ExternalEvidenceValidator,
  FORBIDDEN_SOURCES,
} from "../core/rag/external/ExternalEvidenceContracts";
import { ExternalEvidenceRetriever } from "../core/rag/external/ExternalEvidenceRetriever";
import { QuizEvidenceVerifier } from "../core/guardian/QuizEvidenceVerifier";
import { QuizGuardian } from "../core/guardian/QuizGuardian";
import { GeneratedQuizOutput } from "../core/adapters/QuizGeneratorAdapter";

describe("FactoryOS External Evidence RAG Hardening Suite", () => {
  // ─── 1. CONTRACT & PROVENANCE TESTS ───────────────────────────────────────
  it("01: Validates authoritative external document with valid SHA-256 and HTTPS sourceUrl", () => {
    const content = "Alan Turing introduced the concept of the universal Turing machine in 1936.";
    const contentHash = ExternalEvidenceValidator.computeContentHash(content);

    const doc: AuthoritativeExternalDocument = {
      id: "doc_turing_01",
      sourceId: "wiki_alan_turing",
      sourceType: "WIKIPEDIA",
      sourceTrustLevel: "REFERENCE",
      title: "Alan Turing",
      sourceUrl: "https://en.wikipedia.org/wiki/Alan_Turing",
      content,
      contentHash,
      retrievedAt: new Date().toISOString(),
      metadata: { topic: "Computing History" },
    };

    expect(() => ExternalEvidenceValidator.validate(doc)).not.toThrow();
  });

  it("02: Rejects documents with mismatched SHA-256 contentHash", () => {
    const doc: AuthoritativeExternalDocument = {
      id: "doc_bad_hash",
      sourceId: "wiki_bad",
      sourceType: "WIKIPEDIA",
      sourceTrustLevel: "REFERENCE",
      title: "Bad Hash Doc",
      sourceUrl: "https://en.wikipedia.org/wiki/Test",
      content: "Real content here.",
      contentHash: "invalid_tampered_hash",
      retrievedAt: new Date().toISOString(),
    };

    expect(() => ExternalEvidenceValidator.validate(doc)).toThrow(/contentHash mismatch/);
  });

  it("03: Rejects forbidden source URLs and internal placeholders (Zero-Placeholder Policy)", () => {
    const forbiddenUrls = [
      "https://factoryos.internal/kb/topic-reference",
      "http://example.com/fake",
      "https://internal.test/generated_quiz",
      "ftp://wikipedia.org/test",
    ];

    for (const url of forbiddenUrls) {
      const content = "Some test content";
      const doc: AuthoritativeExternalDocument = {
        id: `doc_${Math.random()}`,
        sourceId: `source_${Math.random()}`,
        sourceType: "WIKIPEDIA",
        sourceTrustLevel: "REFERENCE",
        title: "Test",
        sourceUrl: url,
        content,
        contentHash: ExternalEvidenceValidator.computeContentHash(content),
        retrievedAt: new Date().toISOString(),
      };

      expect(() => ExternalEvidenceValidator.validate(doc)).toThrow();
    }
  });

  // ─── 2. TEXT CHUNKER PROVENANCE PRESERVATION ─────────────────────────────
  it("04: TextChunker chunks external document and preserves complete provenance metadata", () => {
    const content =
      "Artificial intelligence was founded as an academic discipline in 1956 at the Dartmouth workshop. " +
      "In subsequent decades, neural networks and deep learning revolutionized speech recognition, computer vision, and NLP. " +
      "Modern large language models and transformers began dominating the field starting in 2017.";

    const contentHash = ExternalEvidenceValidator.computeContentHash(content);
    const doc: AuthoritativeExternalDocument = {
      id: "doc_ai_history",
      sourceId: "wiki_ai_history",
      sourceType: "WIKIPEDIA",
      sourceTrustLevel: "REFERENCE",
      title: "History of Artificial Intelligence",
      sourceUrl: "https://en.wikipedia.org/wiki/History_of_artificial_intelligence",
      content,
      contentHash,
      retrievedAt: new Date().toISOString(),
    };

    const chunks = ExternalEvidenceRetriever.chunkExternalDocuments([doc]);

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.sourceId).toBe("wiki_ai_history");
      expect(chunk.sourceUrl).toBe("https://en.wikipedia.org/wiki/History_of_artificial_intelligence");
      expect(chunk.title).toBe("History of Artificial Intelligence");
      expect(chunk.chunkId).toContain("chunk_doc_ai_history_");
      expect(chunk.sourceTrustLevel).toBe("REFERENCE");
      expect(chunk.sourceType).toBe("WIKIPEDIA");
      expect(chunk.contentHash).toBeDefined();
    }
  });

  // ─── 3. HARD INSUFFICIENT EVIDENCE POLICY ────────────────────────────────
  it("05: Empty external retrieval produces INSUFFICIENT_EVIDENCE and prevents Guardian PASS", async () => {
    const verifier = new QuizEvidenceVerifier();
    // Seed ZERO external evidence
    await verifier.seedEvidenceChunks([]);

    const sampleQuiz: GeneratedQuizOutput = {
      contentType: "QUIZ_SHORTS",
      hook: "Think you know computing history?",
      title: "Computer Pioneers Quiz",
      description: "Test your knowledge",
      hashtags: ["#quiz", "#tech"],
      renderProfile: "FAST_QUIZ",
      estimatedDuration: 45,
      rawPayload: {},
      questions: [
        {
          difficulty: "easy",
          question: "Who is known as the father of modern computing?",
          options: ["Alan Turing", "Charles Babbage", "Ada Lovelace", "John von Neumann"],
          answer: "Alan Turing",
          explanation: "Alan Turing designed the theoretical foundations of modern computing.",
        },
        {
          difficulty: "medium",
          question: "In what year was the Dartmouth AI conference held?",
          options: ["1956", "1965", "1945", "1972"],
          answer: "1956",
          explanation: "The Dartmouth workshop in 1956 coined the term AI.",
        },
      ],
    };

    const factResult = await verifier.verifyFactuality(sampleQuiz);

    expect(factResult.hasInsufficientEvidence).toBe(true);
    expect(factResult.insufficientEvidenceCount).toBe(2);
    expect(factResult.overallFactualityScore).toBe(0.0);
    expect(factResult.questionChecks[0].status).toBe("INSUFFICIENT_EVIDENCE");
    expect(factResult.questionChecks[0].verdict).toBe("INSUFFICIENT_EVIDENCE");

    // Evaluate with QuizGuardian
    const guardian = new QuizGuardian({ evidenceVerifier: verifier });
    const report = await guardian.evaluate(sampleQuiz);

    // 🔒 Strict requirement: Guardian cannot PASS when evidence is missing
    expect(report.decision).not.toBe("PASS");
    expect(report.insufficientEvidenceCount).toBe(2);
  });

  // ─── 4. REAL INTEGRATION TEST WITH WIKIPEDIA ─────────────────────────────
  it("06: Integration Test — Retrieves real external evidence for AI Milestones and verifies claims", async () => {
    const topic = "Artificial Intelligence & Computing Milestones";
    const externalDocs = await ExternalEvidenceRetriever.retrieveEvidenceForTopic(topic);

    console.log(`\n=================================================`);
    console.log(`FACTORYOS REAL EXTERNAL EVIDENCE RAG REPORT`);
    console.log(`Topic: "${topic}"`);
    console.log(`Total External Documents Retrieved: ${externalDocs.length}`);
    console.log(`-------------------------------------------------`);

    expect(externalDocs.length).toBeGreaterThan(0);

    const chunks = ExternalEvidenceRetriever.chunkExternalDocuments(externalDocs);
    console.log(`Total Evidence Chunks Generated: ${chunks.length}`);

    // Print Evidence Provenance
    externalDocs.forEach((doc, idx) => {
      console.log(`[Doc ${idx + 1}] Title: "${doc.title}"`);
      console.log(`        URL: ${doc.sourceUrl}`);
      console.log(`        Trust Level: ${doc.sourceTrustLevel}`);
      console.log(`        Source Type: ${doc.sourceType}`);
      console.log(`        Content Hash (SHA-256): ${doc.contentHash.slice(0, 16)}...`);
    });

    // Seed into verifier
    const verifier = new QuizEvidenceVerifier();
    await verifier.seedEvidenceChunks(chunks);

    const aiQuiz: GeneratedQuizOutput = {
      contentType: "QUIZ_SHORTS",
      hook: "Only true tech historians know question 2!",
      title: "Artificial Intelligence Milestones Quiz",
      description: "AI History Trivia",
      hashtags: ["#ai", "#trivia"],
      renderProfile: "FAST_QUIZ",
      estimatedDuration: 45,
      rawPayload: {},
      questions: [
        {
          difficulty: "easy",
          question: "What term refers to intelligence demonstrated by machines?",
          options: ["Artificial Intelligence", "Quantum Logic", "Machine Speed", "Virtual Memory"],
          answer: "Artificial Intelligence",
          explanation: "Artificial intelligence refers to machine perception and cognition.",
        },
      ],
    };

    const factCheck = await verifier.verifyFactuality(aiQuiz);

    console.log(`-------------------------------------------------`);
    console.log(`NLI FACTUAL VERIFICATION RESULTS:`);
    factCheck.questionChecks.forEach((qc, i) => {
      console.log(`[Q${i + 1}] Claim Hypothesis: "${qc.hypothesis}"`);
      console.log(`     Verdict: ${qc.verdict}`);
      console.log(`     Score: ${qc.score}`);
      console.log(`     NLI Engine: ${qc.nliResult?.engine}`);
      console.log(`     NLI Confidence: ${(qc.confidence * 100).toFixed(1)}%`);
      if (qc.evidence.length > 0) {
        console.log(`     Evidence Source: ${qc.evidence[0].title} (${qc.evidence[0].sourceUrl})`);
        console.log(`     Chunk ID: ${qc.evidence[0].chunkId}`);
      }
    });
    console.log(`=================================================\n`);

    expect(factCheck.questionChecks[0].nliResult?.engine).toBe("HEURISTIC_NLI");
    expect(factCheck.questionChecks[0].evidence.length).toBeGreaterThan(0);
    expect(factCheck.questionChecks[0].evidence[0].sourceUrl).toContain("wikipedia.org");
  }, 20000);
});
