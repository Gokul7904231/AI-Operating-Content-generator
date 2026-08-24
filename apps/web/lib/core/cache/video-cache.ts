import { BaseCache } from "./cache";

export class VideoCacheClass extends BaseCache<string> {
  constructor() {
    super(200, 86400000 * 14); // 14 days TTL
  }
}

export const VideoCache = new VideoCacheClass();
