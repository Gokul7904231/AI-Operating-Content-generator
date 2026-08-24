import { BaseCache } from "./cache";

export class BenchmarkCacheClass extends BaseCache<any> {
  constructor() {
    super(500, 3600000); // 1 hour TTL
  }
}

export const BenchmarkCache = new BenchmarkCacheClass();
