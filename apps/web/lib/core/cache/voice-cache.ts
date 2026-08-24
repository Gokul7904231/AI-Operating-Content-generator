import { BaseCache } from "./cache";

export class VoiceCacheClass extends BaseCache<string> {
  constructor() {
    super(1000, 86400000 * 7); // 7 days TTL
  }
}

export const VoiceCache = new VoiceCacheClass();
