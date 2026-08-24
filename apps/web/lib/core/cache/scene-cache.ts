import { BaseCache } from "./cache";

export class SceneCacheClass extends BaseCache<any[]> {
  constructor() {
    super(500, 86400000); // 24 hour TTL
  }
}

export const SceneCache = new SceneCacheClass();
