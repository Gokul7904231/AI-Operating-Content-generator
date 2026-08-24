import { BaseCache } from "./cache";

export class ProviderCacheClass extends BaseCache<any> {
  constructor() {
    super(100, 1800000); // 30 minutes TTL
  }
}

export const ProviderCache = new ProviderCacheClass();
