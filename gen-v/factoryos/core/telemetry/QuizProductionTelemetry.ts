import { InMemoryLogCollector } from "../observability/InMemoryLogCollector";
import { InMemoryMetricCollector } from "../observability/InMemoryMetricCollector";
import { InMemoryTraceCollector } from "../observability/InMemoryTraceCollector";
import { QuizQualityReportData } from "../guardian/QuizQualityReport";

export class QuizProductionTelemetry {
  readonly logCollector: InMemoryLogCollector;
  readonly metricCollector: InMemoryMetricCollector;
  readonly traceCollector: InMemoryTraceCollector;

  constructor(options?: {
    logCollector?: InMemoryLogCollector;
    metricCollector?: InMemoryMetricCollector;
    traceCollector?: InMemoryTraceCollector;
  }) {
    this.logCollector = options?.logCollector ?? new InMemoryLogCollector();
    this.metricCollector = options?.metricCollector ?? new InMemoryMetricCollector();
    this.traceCollector = options?.traceCollector ?? new InMemoryTraceCollector();
  }

  recordEvaluation(runId: string, report: QuizQualityReportData): void {
    const traceId = `trace_quiz_${runId}`;

    // Record decision counter
    this.metricCollector.counter("quiz_guardian_decisions_total", 1, {
      decision: report.decision,
      title: report.quizTitle,
    });

    // Record quality metrics
    this.metricCollector.histogram("quiz_quality_overall_score", report.overallScore);
    this.metricCollector.histogram("quiz_quality_structure_score", report.structureScore);
    this.metricCollector.histogram("quiz_quality_uniqueness_score", report.uniquenessScore);
    this.metricCollector.histogram("quiz_quality_ambiguity_score", report.ambiguityScore);
    this.metricCollector.histogram("quiz_quality_factuality_score", report.factualityScore);

    // Create telemetry span
    const span = this.traceCollector.startSpan("QuizGuardian.evaluate", undefined, {
      runId,
      decision: report.decision,
      title: report.quizTitle,
    });

    this.logCollector.log(
      "info",
      `Quiz Guardian evaluation completed for "${report.quizTitle}" with decision: ${report.decision}`,
      {
        runId,
        decision: report.decision,
        overallScore: report.overallScore,
        reasonsCount: report.summaryReasons.length,
        traceId,
      }
    );

    this.traceCollector.endSpan(span.spanId, { status: "OK" });
  }
}
