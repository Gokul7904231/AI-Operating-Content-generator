import { BaseCache } from "./cache";

export class PromptCacheClass extends BaseCache<string> {
  constructor() {
    super(2000, 7200000); // 2 hour default cache TTL
  }
}

export const PromptCache = new PromptCacheClass();
