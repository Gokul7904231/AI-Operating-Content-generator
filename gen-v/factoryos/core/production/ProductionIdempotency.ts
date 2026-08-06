import crypto from "crypto";

export class ProductionIdempotency {
  static generateScheduleKey(date: string, slot: number, topic: string): string {
    const normTopic = String(topic ?? "").trim().toLowerCase();
    const hash = crypto.createHash("sha256").update(`${date}_slot_${slot}_${normTopic}`).digest("hex").slice(0, 12);
    return `idem_sched_${date}_s${slot}_${hash}`;
  }

  static generateDeliveryKey(jobId: string, videoFilePath: string): string {
    const hash = crypto.createHash("sha256").update(`${jobId}_${videoFilePath}`).digest("hex").slice(0, 12);
    return `idem_deliv_${jobId}_${hash}`;
  }
}
