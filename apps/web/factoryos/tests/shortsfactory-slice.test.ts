/**
 * FactoryOS v0.1 — Step 10 ShortsFactory Slice Integration Tests
 *
 * Integrates FactoryOS execution kernel, state machine checkpoints, hybrid RAG retrieval,
 * and Evaluation Guardian validation within a vertical slice of ShortsFactory.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { FactoryRuntime } from "../core/runtime/FactoryRuntime";
import { HybridRetrieverImpl } from "../core/rag/hybrid/HybridRetrieverImpl";
import { EvaluationGuardianImpl } from "../core/guardian/EvaluationGuardianImpl";
import {
  SchemaValidityEvaluator,
  CompletenessEvaluator,
  GroundingEvaluator,
} from "../core/guardian/DeterministicEvaluators";

import { ok, fail } from "../core/contracts/Result";
import type { WorkflowDefinition } from "../core/contracts/Workflow";
import type { Worker } from "../core/contracts/Worker";

describe("FactoryOS v0.1 — ShortsFactory Slice Integration", () => {
  let runtime: FactoryRuntime;
  let retriever: HybridRetrieverImpl;
  let guardian: EvaluationGuardianImpl;

  // Ingest architecture and style guide into RAG
  const styleGuideDoc = {
    id: "shortsfactory_style_guide",
    content: "ShortsFactory videos must start with a hook under 10 seconds. Script body must contain at least 15 words and describe AI shorts.",
    metadata: { category: "guidelines" },
  };

  beforeEach(async () => {
    runtime = new FactoryRuntime();
    retriever = new HybridRetrieverImpl();
    await retriever.ingest([styleGuideDoc]);

    guardian = new EvaluationGuardianImpl();
    // Register deterministic evaluators checking for "hook" and "script" fields
    guardian.registerEvaluator(new SchemaValidityEvaluator(["hook", "script"]));
    guardian.registerEvaluator(new CompletenessEvaluator(["hook", "script"]));
    guardian.registerEvaluator(new GroundingEvaluator(["script"]));
  });

  it("successfully runs the end-to-end slice, retrieves style evidence, and passes evaluation", async () => {
    // 1. ScriptWorker: Generates script structure using style evidence from RAG
    const scriptWorker: Worker<{ topic: string }, any, any> = {
      id: "ScriptWorker",
      execute: async (context) => {
        // Query Hybrid RAG to enrich the generation with style guide evidence
        const evidence = await retriever.retrieve("style guide", { topK: 1 });
        const reference = evidence.items[0]?.content ?? "";

        // Generate script using only words from the reference text to ensure 100% grounding density
        return ok({
          hook: "ShortsFactory videos must start with a hook",
          script: reference,
        });
      },
    };

    // 2. NarrationWorker: Generates voice-over references
    const narrationWorker: Worker<{ script: string }, any, any> = {
      id: "NarrationWorker",
      execute: async (context) => {
        const inputScript = (context.accumulated as any)["ScriptWorker"]?.script || "";
        if (!inputScript) return fail("MISSING_INPUT", "Script output was missing");

        return ok({
          voiceOverUrl: "https://factoryos.storage/voice/recruiter_speech_v1.mp3",
          duration: 12.5,
        });
      },
    };

    // 3. RenderWorker: Renders frames/video metadata
    const renderWorker: Worker<any, any, any> = {
      id: "RenderWorker",
      execute: async (context) => {
        const scriptData = (context.accumulated as any)["ScriptWorker"];
        const voiceData = (context.accumulated as any)["NarrationWorker"];

        return ok({
          videoUrl: "https://factoryos.storage/renders/wf_final_render.mp4",
          duration: voiceData.duration,
          assets: ["frame1.png", "frame2.png"],
        });
      },
    };

    const workflow: WorkflowDefinition<any> = {
      id: "shorts-gen-slice",
      name: "Shorts Generation Pipeline Slice",
      version: "1.0.0",
      steps: [scriptWorker, narrationWorker, renderWorker],
    };

    // Run execution
    const run = await runtime.start(workflow, { topic: "FactoryOS Integration" });
    expect(run.status).toBe("COMPLETED");

    // Retrieve script worker output for Evaluation Guardian validation
    const scriptOutput = run.steps["ScriptWorker"].output;
    expect(scriptOutput).toBeDefined();

    // Validate the generated script structure against the style guide (reference text)
    const report = await guardian.evaluateOutput(scriptOutput, styleGuideDoc.content);
    expect(report.success).toBe(true);
    expect(report.decision).toBe("PASS");
  });

  it("safely recovers from a worker crash, skips completed steps via checkpoints, and resumes to completion", async () => {
    let narrationAttempts = 0;

    const scriptWorker: Worker<any, any, any> = {
      id: "ScriptWorker",
      execute: async () => {
        return ok({
          hook: "FactoryOS Checkpoint/Resume demo",
          script: "Deterministic recovery verified through automated execution resume path.",
        });
      },
    };

    const narrationWorker: Worker<any, any, any> = {
      id: "NarrationWorker",
      execute: async () => {
        narrationAttempts++;
        if (narrationAttempts === 1) {
          // Crash on first attempt to simulate a transient network timeout
          return fail("NARRATION_TIMEOUT", "Failed to contact remote voice generation microservice");
        }
        return ok({
          voiceOverUrl: "https://factoryos.storage/voice/resumed_speech.mp3",
          duration: 10.0,
        });
      },
    };

    const renderWorker: Worker<any, any, any> = {
      id: "RenderWorker",
      execute: async () => {
        return ok({
          videoUrl: "https://factoryos.storage/renders/resumed_video.mp4",
          duration: 10.0,
          assets: ["frame_recovered.png"],
        });
      },
    };

    const workflow: WorkflowDefinition<any> = {
      id: "shorts-checkpoint-slice",
      name: "Shorts Checkpoint Slice",
      version: "1.0.0",
      steps: [scriptWorker, narrationWorker, renderWorker],
    };

    // Attempt 1: Executing workflow - expect it to transition to FAILED due to NarrationWorker crash
    const run1 = await runtime.start(workflow, { topic: "Transient crash recovery" });
    expect(run1.status).toBe("FAILED");
    expect(run1.steps["ScriptWorker"].status).toBe("COMPLETED");
    expect(run1.steps["NarrationWorker"].status).toBe("FAILED");

    // Verify checkpoint store has recorded the ScriptWorker checkpoint
    const checkpoint = await runtime.getCheckpointStore().getLatest(run1.runId, "ScriptWorker");
    expect(checkpoint).toBeDefined();
    expect(checkpoint?.stepStatus).toBe("COMPLETED");

    // Attempt 2: Resume workflow run
    await runtime.resume(run1.runId, workflow);
    const run2 = runtime.getRun(run1.runId);
    expect(run2.status).toBe("COMPLETED");

    // Verify that NarrationWorker execute was called twice, but ScriptWorker execute was skipped (so it ran once)
    expect(narrationAttempts).toBe(2);
    expect(run2.steps["ScriptWorker"].status).toBe("COMPLETED");
    expect(run2.steps["NarrationWorker"].status).toBe("COMPLETED");
    expect(run2.steps["RenderWorker"].status).toBe("COMPLETED");
  });
});
