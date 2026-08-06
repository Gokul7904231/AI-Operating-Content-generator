import fs from "fs";
import path from "path";
import { ProductionJob } from "./ProductionJob";

export interface ProductionHistoryRecord {
  jobId: string;
  date: string;
  topic: string;
  status: string;
  guardianDecision?: string;
  videoPath?: string;
  deliveryMethod?: string;
  createdAt: string;
  completedAt?: string;
}

export class ProductionHistoryStore {
  private filePath: string;
  private records: ProductionHistoryRecord[] = [];

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.join(process.cwd(), "data", "production_history.json");
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.load();
  }

  load(): void {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        this.records = JSON.parse(raw);
      } catch (err: any) {
        console.warn(`[ProductionHistoryStore] Failed loading history from disk: ${err?.message ?? err}`);
        this.records = [];
      }
    }
  }

  saveRecord(job: ProductionJob): void {
    const record: ProductionHistoryRecord = {
      jobId: job.id,
      date: job.requestedDate,
      topic: job.topic,
      status: job.status,
      guardianDecision: job.guardianReport?.decision,
      videoPath: job.videoArtifact?.filePath,
      deliveryMethod: job.deliveryArtifact?.deliveryMethod,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };

    const idx = this.records.findIndex((r) => r.jobId === job.id);
    if (idx >= 0) {
      this.records[idx] = record;
    } else {
      this.records.push(record);
    }

    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.records, null, 2));
    } catch (err: any) {
      console.error(`[ProductionHistoryStore] Failed writing history to disk: ${err?.message ?? err}`);
    }
  }

  getRecordsForDate(date: string): ProductionHistoryRecord[] {
    return this.records.filter((r) => r.date === date);
  }

  getAllRecords(): ProductionHistoryRecord[] {
    return [...this.records];
  }
}
