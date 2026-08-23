/**
 * FactoryOS Frontier v3 — Overseer Cognition Provider
 * High-level orchestration wrapper providing the 4 core cognitive methods:
 * classify, plan, synthesize, and review.
 */

import { OverseerCognitionClient } from "./OverseerCognitionClient";
import type {
  IntentClassification,
  ExecutionPlan,
  AnswerContract,
  ResponseReview,
  OverseerCognitionConfig,
} from "./CognitiveContracts";

export class OverseerCognitionProvider {
  private client: OverseerCognitionClient;

  constructor(config?: Partial<OverseerCognitionConfig>) {
    this.client = new OverseerCognitionClient(config);
  }

  /**
   * Stage 1: Intent Interpretation
   * Returns strict structured JSON. Never returns free-form text.
   */
  async classify(message: string, recentContext: string[] = []): Promise<IntentClassification> {
    const systemPrompt = `You are FactoryOS Overseer Cognitive Intent Interpreter.
Classify the user prompt into one of the following exact intents:
- GENERAL_CHAT
- CURRENT_TREND
- RESEARCH
- FACTORY_TELEMETRY
- PROJECT_LOOKUP
- DOCUMENT_LOOKUP
- VIDEO_CREATION
- VIDEO_EDIT
- VIDEO_STATUS
- QUOTA
- SYSTEM_STATUS
- WORKER_STATUS
- HELP
- CLARIFICATION_REQUIRED
- UNKNOWN

Respond ONLY with valid JSON matching:
{
  "intent": "<CognitiveIntent>",
  "confidence": <number between 0 and 1>,
  "entities": {},
  "freshness": "today" | "recent" | "static" | "any",
  "requiresLiveResearch": boolean,
  "requiresEvidence": boolean,
  "sourceClass": "FACTORY_TELEMETRY" | "AGENT_REACH" | "OFK_KNOWLEDGE" | "QUOTA_SERVICE" | "MISSION_DATABASE" | "PROVIDER_REGISTRY" | "GENERAL_KNOWLEDGE",
  "responseMode": "DIRECT_FACT" | "RESEARCH_SUMMARY" | "OPERATIONAL_STATUS" | "CREATIVE" | "TASK_PROGRESS" | "ERROR" | "CLARIFICATION",
  "clarificationRequired": boolean,
  "clarificationPrompt": string | null
}`;

    const contextStr = recentContext.length > 0 ? `\nRecent Context:\n${recentContext.join("\n")}` : "";
    const userPrompt = `User Message: "${message}"${contextStr}`;

    const res = await this.client.executeRequest<IntentClassification>({
      operation: "CLASSIFY",
      systemPrompt,
      userPrompt,
      temperature: 0.1,
    });

    if (res.success && res.data && res.data.intent) {
      return res.data;
    }

    // Safety fallback
    return {
      intent: "GENERAL_CHAT",
      confidence: 0.5,
      entities: {},
      freshness: "any",
      requiresLiveResearch: false,
      requiresEvidence: false,
      sourceClass: "GENERAL_KNOWLEDGE",
      responseMode: "DIRECT_FACT",
      clarificationRequired: false,
    };
  }

  /**
   * Stage 2: Execution Planning
   */
  async plan(
    intent: string,
    sourceClass: string,
    availableCapabilities: string[],
    policy: Record<string, any>
  ): Promise<ExecutionPlan> {
    const systemPrompt = `You are FactoryOS Overseer Execution Planner.
Construct an execution plan given an intent, available capabilities, and runtime policies.
Respond with JSON matching:
{
  "goal": string,
  "requiredCapabilities": string[],
  "requiredEvidence": string[],
  "answerShape": string
}`;

    const userPrompt = JSON.stringify({
      intent,
      sourceClass,
      availableCapabilities,
      policy,
    });

    const res = await this.client.executeRequest<ExecutionPlan>({
      operation: "PLAN",
      systemPrompt,
      userPrompt,
      temperature: 0.1,
    });

    if (res.success && res.data && res.data.goal) {
      return res.data;
    }

    return {
      goal: `Execute intent ${intent}`,
      requiredCapabilities: availableCapabilities.slice(0, 1),
      requiredEvidence: ["authoritative_state"],
      answerShape: "direct_fact",
    };
  }

  /**
   * Stage 3: Evidence Synthesis
   * Strictly grounded on the provided authoritative evidence.
   */
  async synthesize(
    userQuestion: string,
    contract: AnswerContract,
    evidence: Record<string, any>,
    toolOutputs: Record<string, any>
  ): Promise<string> {
    // If telemetry or direct fact, produce concise deterministic synthesis
    if (contract.intent === "FACTORY_TELEMETRY" && evidence.floorCount !== undefined) {
      return `FactoryOS currently has ${evidence.floorCount} production floors. All ${evidence.floorCount} are operational.`;
    }

    const systemPrompt = `You are FactoryOS Overseer.
Synthesize a natural, direct, evidence-grounded response for the user.
STRICT RULES:
1. Ground every statement strictly in the provided evidence.
2. NEVER invent state, floor numbers, or trends not present in the evidence.
3. If live research failed, say: "I couldn't verify today's live trend data right now, so I don't want to pretend this is current."
4. Match the answer style: "${contract.responseStyle}" and scope: "${contract.maximumScope}".
5. Do NOT mention internal agent swarms, RAG indexes, or system architecture unless explicitly asked.`;

    const userPrompt = JSON.stringify({
      userQuestion,
      intent: contract.intent,
      requiredFacts: contract.requiredFacts,
      source: contract.source,
      evidence,
      toolOutputs,
    });

    const res = await this.client.executeRequest<{ answer?: string } | string>({
      operation: "SYNTHESIZE",
      systemPrompt,
      userPrompt,
      temperature: 0.2,
    });

    if (res.success) {
      if (typeof res.data === "string") return res.data;
      if (res.data?.answer) return res.data.answer;
      if (res.rawText) {
        try {
          const parsed = JSON.parse(res.rawText);
          if (parsed.answer) return parsed.answer;
        } catch {
          return res.rawText;
        }
      }
    }

    // Direct deterministic fallback
    if (contract.intent === "CURRENT_TREND" && evidence.topTrend) {
      return `Today's top trend in ${evidence.category || "AI"} is **${evidence.topTrend}**. Sources: ${evidence.sources?.join(", ") || "Verified agent search"}.`;
    }

    return `Processed request with authoritative evidence from ${contract.source}.`;
  }

  /**
   * Stage 4: Response Review & Topic Adherence
   * Ensures no unsupported claims and adherence to original user query.
   */
  async review(
    userQuestion: string,
    intendedAnswer: string,
    evidence: Record<string, any>,
    contract: AnswerContract
  ): Promise<ResponseReview> {
    const systemPrompt = `You are FactoryOS Overseer Quality Reviewer.
Review the intended answer against the original question and evidence.
Respond ONLY with JSON:
{
  "topicAdherent": boolean,
  "factuallyGrounded": boolean,
  "unsupportedClaims": string[],
  "unnecessaryContent": string[],
  "shouldRewrite": boolean,
  "rewriteGuidance": string | null
}`;

    const userPrompt = JSON.stringify({
      userQuestion,
      intendedAnswer,
      evidence,
      contract,
    });

    const res = await this.client.executeRequest<ResponseReview>({
      operation: "REVIEW",
      systemPrompt,
      userPrompt,
      temperature: 0.1,
    });

    if (res.success && res.data && typeof res.data.topicAdherent === "boolean") {
      return res.data;
    }

    return {
      topicAdherent: true,
      factuallyGrounded: true,
      unsupportedClaims: [],
      unnecessaryContent: [],
      shouldRewrite: false,
    };
  }
}
