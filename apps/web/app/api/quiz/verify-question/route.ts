import { NextResponse } from "next/server";
import { ExternalEvidenceRetriever } from "@/factoryos/core/rag/external/ExternalEvidenceRetriever";
import { QuizEvidenceVerifier } from "@/factoryos/core/guardian/QuizEvidenceVerifier";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const question = body.question;
    const topic = String(body.topic || question?.topicName || "General Knowledge").trim();

    if (!question || !question.question || !question.answer) {
      return NextResponse.json(
        { error: "Question text and answer are required for verification." },
        { status: 400 }
      );
    }

    // Retrieve real external evidence for the question's topic
    const externalDocs = await ExternalEvidenceRetriever.retrieveEvidenceForTopic(topic);
    const chunks = ExternalEvidenceRetriever.chunkExternalDocuments(externalDocs);

    const verifier = new QuizEvidenceVerifier();
    await verifier.seedEvidenceChunks(chunks);

    const check = await verifier.verifyFactuality({
      contentType: "QUIZ_SHORTS",
      hook: "Verification Check",
      title: topic,
      description: "",
      hashtags: [],
      renderProfile: "FAST_QUIZ",
      estimatedDuration: 45,
      rawPayload: {},
      questions: [
        {
          difficulty: question.difficulty || "medium",
          question: question.question,
          options: question.options || [question.answer],
          answer: question.answer,
          explanation: question.explanation || "",
        },
      ],
    });

    const result = check.questionChecks[0] || {
      status: "INSUFFICIENT_EVIDENCE",
      verdict: "INSUFFICIENT_EVIDENCE",
      score: 0.0,
      confidence: 0.0,
      evidence: [],
      reason: "Verification check produced no evaluation result.",
    };

    return NextResponse.json({
      success: true,
      questionId: question.questionId,
      revision: question.revision,
      status: result.status,
      verdict: result.verdict,
      score: result.score,
      confidence: result.confidence,
      evidence: result.evidence,
      nliResult: (result as any).nliResult,
      reason: result.reason,
      verified: result.status === "SUPPORTED",
    });
  } catch (err: any) {
    console.error("[API /api/quiz/verify-question Error]:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to verify question claim." },
      { status: 500 }
    );
  }
}
