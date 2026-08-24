import { BaseCache } from "./cache";

export class ModelCacheClass extends BaseCache<any> {
  constructor() {
    super(200, 1800000); // 30 minutes TTL
  }
}

export const ModelCache = new ModelCacheClass();
