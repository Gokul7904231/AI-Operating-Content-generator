/**
 * GET /api/workers/metrics
 *
 * Returns a combined dashboard payload:
 * - Storage queue stats + dead letter queue
 * - Publisher queue stats + dead letter queue
 * - Metrics summary (24h)
 * - Time-series data for charts
 */
import { NextResponse } from "next/server";
import "../../../../storage/index";
import "../../../../publishing/index";
import { StorageQueue } from "../../../../storage/upload-queue";
import { PublisherQueue } from "../../../../publishing/publisher-queue";
import { MetricsDB, UploadJobDB, PublishJobDB } from "../../../../lib/queue-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const storageStats = StorageQueue.getStats();
    const publisherStats = PublisherQueue.getStats();
    const dashSummary = MetricsDB.getDashboardSummary();

    // Time-series for charts (last 24h)
    const uploadDurationSeries  = MetricsDB.timeSeries("upload_duration_ms",  "storage",   24);
    const publishDurationSeries = MetricsDB.timeSeries("publish_duration_ms", "publisher", 24);
    const failureSeries         = MetricsDB.timeSeries("failure",             "storage",   24);
    const retrySeries           = MetricsDB.timeSeries("retry_count",         "storage",   24);

    // Failure % calculation
    const storageSuccessCount  = MetricsDB.count("success",  "storage",   24);
    const storageFailureCount  = MetricsDB.count("failure",  "storage",   24);
    const publishSuccessCount  = MetricsDB.count("success",  "publisher", 24);
    const publishFailureCount  = MetricsDB.count("failure",  "publisher", 24);
    const storageRetryCount    = MetricsDB.count("retry_count", "storage", 24);

    const storageTotal   = storageSuccessCount + storageFailureCount;
    const publishTotal   = publishSuccessCount + publishFailureCount;

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),

      storage: {
        ...storageStats,
        successCount:   storageSuccessCount,
        failureCount:   storageFailureCount,
        retryCount:     storageRetryCount,
        failureRate:    storageTotal > 0 ? Math.round((storageFailureCount / storageTotal) * 100) : 0,
        retryRate:      storageTotal > 0 ? Math.round((storageRetryCount   / storageTotal) * 100) : 0,
        avgUploadMs:    Math.round(dashSummary.upload.avgDurationMs),
        avgFileSizeKB:  Math.round(dashSummary.upload.avgFileSizeBytes / 1024),
        queue:          StorageQueue.getQueue().slice(0, 50).map(formatUploadJob),
        deadLetter:     StorageQueue.getDeadLetterQueue().slice(0, 20).map(formatUploadJob),
      },

      publisher: {
        ...publisherStats,
        successCount: publishSuccessCount,
        failureCount: publishFailureCount,
        failureRate:  publishTotal > 0 ? Math.round((publishFailureCount / publishTotal) * 100) : 0,
        avgPublishMs: Math.round(dashSummary.publish.avgDurationMs),
        queue:        PublisherQueue.getQueue().slice(0, 50).map(formatPublishJob),
        deadLetter:   PublisherQueue.getDeadLetterQueue().slice(0, 20).map(formatPublishJob),
      },

      charts: {
        uploadDuration:  uploadDurationSeries,
        publishDuration: publishDurationSeries,
        failures:        failureSeries,
        retries:         retrySeries,
      },
    });
  } catch (err: any) {
    console.error("[/api/workers/metrics]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function formatUploadJob(j: any) {
  return {
    id: j.id,
    jobId: j.jobId,
    engine: j.engine,
    status: j.status,
    attempts: j.attempts,
    maxAttempts: j.maxAttempts,
    nextRetryAt: j.nextRetryAt ? new Date(j.nextRetryAt).toISOString() : null,
    lastError: j.lastError,
    createdAt: new Date(j.createdAt).toISOString(),
    sha256: j.sha256 ? j.sha256.slice(0, 12) + "..." : null,
  };
}

function formatPublishJob(j: any) {
  return {
    id: j.id,
    jobId: j.jobId,
    platform: j.platform,
    status: j.status,
    attempts: j.attempts,
    nextRetryAt: j.nextRetryAt ? new Date(j.nextRetryAt).toISOString() : null,
    lastError: j.lastError,
    createdAt: new Date(j.createdAt).toISOString(),
  };
}
