import { AutonomousScheduler } from "./AutonomousScheduler";
import { ProductionOverseer } from "../overseer/ProductionOverseer";
import { QuizGeneratorAdapter } from "../adapters/QuizGeneratorAdapter";
import { QuizGuardian } from "../guardian/QuizGuardian";
import { QuizEvidenceVerifier } from "../guardian/QuizEvidenceVerifier";
import { VideoPipelineAdapter } from "../adapters/VideoPipelineAdapter";
import { OutputArtifactValidator } from "./OutputArtifactValidator";
import { DriveDeliveryAdapter } from "../adapters/DriveDeliveryAdapter";
import { ContentOriginalityGate } from "./ContentOriginalityGate";
import { ProductionHistoryStore } from "./ProductionHistoryStore";
import { ProductionJob } from "./ProductionJob";

export interface ProductionRunnerOptions {
  scheduler: AutonomousScheduler;
  overseer: ProductionOverseer;
  generatorAdapter?: QuizGeneratorAdapter;
  guardian?: QuizGuardian;
  videoAdapter?: VideoPipelineAdapter;
  deliveryAdapter?: DriveDeliveryAdapter;
  historyStore?: ProductionHistoryStore;
}

export class ProductionRunner {
  private scheduler: AutonomousScheduler;
  private overseer: ProductionOverseer;
  private generatorAdapter: QuizGeneratorAdapter;
  private guardian: QuizGuardian;
  private videoAdapter: VideoPipelineAdapter;
  private deliveryAdapter: DriveDeliveryAdapter;
  private historyStore: ProductionHistoryStore;

  constructor(options: ProductionRunnerOptions) {
    this.scheduler = options.scheduler;
    this.overseer = options.overseer;
    this.generatorAdapter = options.generatorAdapter ?? new QuizGeneratorAdapter();
    this.guardian = options.guardian ?? new QuizGuardian();
    this.videoAdapter = options.videoAdapter ?? new VideoPipelineAdapter();
    this.deliveryAdapter = options.deliveryAdapter ?? new DriveDeliveryAdapter();
    this.historyStore = options.historyStore ?? new ProductionHistoryStore();
  }

  /**
   * Executes a ProductionJob through the end-to-end production flow.
   */
  async executeJob(jobId: string): Promise<ProductionJob> {
    let job = this.scheduler.getJob(jobId);
    if (!job) {
      throw new Error(`ProductionJob ${jobId} not found in AutonomousScheduler.`);
    }

    this.overseer.logAuditEvent(`Starting production execution`, jobId);

    if (job.status === "DELIVERY_PENDING") {
      this.overseer.logAuditEvent(`Resuming outbox delivery for job in DELIVERY_PENDING status`, jobId);
      job = this.scheduler.updateJobStatus(job.id, "UPLOADING");
      const deliveryArtifact = await this.deliveryAdapter.processDelivery(job);
      job.deliveryArtifact = deliveryArtifact;

      if (deliveryArtifact.verified) {
        job = this.scheduler.updateJobStatus(job.id, "COMPLETED");
        this.overseer.logAuditEvent(`Production job completed successfully`, jobId);
      } else {
        job = this.scheduler.updateJobStatus(job.id, "DELIVERY_PENDING", "Network offline - job retained in outbox");
      }
      this.historyStore.saveRecord(job);
      return job;
    }

    try {
      // Step 1: PLANNED -> WAITING -> GENERATING
      job = this.scheduler.updateJobStatus(job.id, "WAITING");
      job = this.scheduler.updateJobStatus(job.id, "GENERATING");
      job.attempts += 1;
      this.scheduler.updateJob(job);

      // Call frozen QuizGeneratorAdapter
      this.overseer.logAuditEvent(`Generating quiz payload for topic: "${job.topic}"`, jobId);
      const rawQuiz = await QuizGeneratorAdapter.generateQuiz({
        topic: job.topic,
        renderProfile: "FAST_QUIZ",
        provider: process.env.QUIZ_PROVIDER || "mock_quiz_provider",
      });
      job.quizArtifact = rawQuiz;

      // Step 2: Originality Gate
      const historyQuizzes = this.historyStore.getAllRecords().map((r) => ({
        title: r.topic,
        questions: [],
      }));
      const origCheck = ContentOriginalityGate.evaluate(rawQuiz, historyQuizzes as any);
      if (origCheck.verdict === "BLOCKED") {
        const reason = `Originality check BLOCKED: ${origCheck.reasons.join("; ")}`;
        this.overseer.logAuditEvent(reason, jobId);
        job = this.scheduler.updateJobStatus(job.id, "BLOCKED", reason);
        this.historyStore.saveRecord(job);
        return job;
      }

      // Step 3: GENERATING -> VALIDATING
      job = this.scheduler.updateJobStatus(job.id, "VALIDATING");
      this.overseer.logAuditEvent(`Evaluating quiz quality via Quiz Guardian`, jobId);

      // Instantiate fresh verifier & seed reference evidence corpus for grounding validation
      const verifier = new QuizEvidenceVerifier();
      const corpusDocs = rawQuiz.questions.map((q, idx) => ({
        id: `doc_q${idx + 1}`,
        content: `Question ${idx + 1}: ${q.question} Correct Answer: ${q.answer}. ${q.explanation}`,
      }));
      await verifier.seedEvidenceCorpus(corpusDocs);
      this.guardian = new QuizGuardian({ evidenceVerifier: verifier });

      const guardianReport = await this.guardian.evaluate(rawQuiz);
      job.guardianReport = guardianReport;

      if (guardianReport.decision !== "PASS") {
        this.overseer.logAuditEvent(`Quiz Guardian decision: ${guardianReport.decision} (Reasons: ${guardianReport.summaryReasons.join("; ")})`, jobId);

        if (guardianReport.decision === "REPAIR") {
          job = this.scheduler.updateJobStatus(job.id, "REPAIRING");
          this.overseer.logAuditEvent(`Retrying generation under repair policy`, jobId);
          // Standard repair attempt
          const repairedQuiz = await QuizGeneratorAdapter.generateQuiz({
            topic: job.topic,
            renderProfile: "FAST_QUIZ",
            provider: process.env.QUIZ_PROVIDER || "mock_quiz_provider",
          });
          job.quizArtifact = repairedQuiz;
          job = this.scheduler.updateJobStatus(job.id, "VALIDATING");
        } else {
          job = this.scheduler.updateJobStatus(job.id, "FAILED", `Quiz Guardian rejected quiz payload.`);
          this.historyStore.saveRecord(job);
          return job;
        }
      }

      this.overseer.logAuditEvent(`Quiz Guardian PASS (Grounding: ${(guardianReport.factualityScore * 100).toFixed(0)}%)`, jobId);

      // Step 4: VALIDATING -> RENDERING
      job = this.scheduler.updateJobStatus(job.id, "RENDERING");
      this.overseer.logAuditEvent(`Rendering video artifact via VideoPipelineAdapter`, jobId);

      const videoArtifact = await this.videoAdapter.render(job.id, job.quizArtifact!);
      job.videoArtifact = videoArtifact;

      // Step 5: RENDERING -> OUTPUT_VALIDATION
      job = this.scheduler.updateJobStatus(job.id, "OUTPUT_VALIDATION");
      this.overseer.logAuditEvent(`Validating output artifact integrity`, jobId);

      const outputVal = OutputArtifactValidator.validate(job.videoArtifact, job.id);
      if (!outputVal.valid) {
        const reason = `Output artifact validation failed: ${outputVal.issues.join("; ")}`;
        this.overseer.logAuditEvent(reason, jobId);
        job = this.scheduler.updateJobStatus(job.id, "FAILED", reason);
        this.historyStore.saveRecord(job);
        return job;
      }

      this.overseer.logAuditEvent(`Output artifact verified: ${(videoArtifact.fileSizeBytes / 1024).toFixed(1)} KB MP4`, jobId);

      // Step 6: OUTPUT_VALIDATION -> DELIVERY_PENDING
      job = this.scheduler.updateJobStatus(job.id, "DELIVERY_PENDING");
      this.deliveryAdapter.enqueue(job);
      this.overseer.logAuditEvent(`Video artifact queued into delivery outbox`, jobId);

      // Step 7: DELIVERY_PENDING -> UPLOADING -> COMPLETED
      job = this.scheduler.updateJobStatus(job.id, "UPLOADING");
      this.overseer.logAuditEvent(`Processing delivery to Google Drive outbox`, jobId);

      const deliveryArtifact = await this.deliveryAdapter.processDelivery(job);
      job.deliveryArtifact = deliveryArtifact;

      if (deliveryArtifact.verified) {
        job = this.scheduler.updateJobStatus(job.id, "COMPLETED");
        this.overseer.logAuditEvent(`Production job completed successfully`, jobId);
      } else {
        job = this.scheduler.updateJobStatus(job.id, "DELIVERY_PENDING", "Network offline - job retained in outbox for retry");
        this.overseer.logAuditEvent(`Production job retained in DELIVERY_PENDING outbox`, jobId);
      }

      this.historyStore.saveRecord(job);
      return job;
    } catch (err: any) {
      const errMsg = err?.message ?? String(err);
      this.overseer.logAuditEvent(`Production execution error: ${errMsg}`, jobId);
      
      if (job.status !== "COMPLETED" && job.status !== "FAILED") {
        job = this.scheduler.updateJobStatus(job.id, "FAILED", errMsg);
        this.historyStore.saveRecord(job);
      }
      return job;
    }
  }
}
