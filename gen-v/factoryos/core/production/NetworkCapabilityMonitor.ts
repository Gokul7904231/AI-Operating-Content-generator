export type NetworkCapability = "ONLINE" | "DEGRADED" | "OFFLINE" | "UNKNOWN";

export class NetworkCapabilityMonitor {
  private static instance: NetworkCapabilityMonitor;
  private currentStatus: NetworkCapability = "ONLINE"; // Default assumption

  private constructor() {}

  static getInstance(): NetworkCapabilityMonitor {
    if (!NetworkCapabilityMonitor.instance) {
      NetworkCapabilityMonitor.instance = new NetworkCapabilityMonitor();
    }
    return NetworkCapabilityMonitor.instance;
  }

  setStatus(status: NetworkCapability): void {
    console.log(`[NetworkCapabilityMonitor] Status transition: ${this.currentStatus} -> ${status}`);
    this.currentStatus = status;
  }

  getStatus(): NetworkCapability {
    return this.currentStatus;
  }

  isNetworkRequired(operation: "LOCAL" | "NETWORK"): boolean {
    if (operation === "LOCAL") return true; // Local operations always proceed
    return this.currentStatus === "ONLINE" || this.currentStatus === "DEGRADED";
  }
}
