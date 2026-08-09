import { WorkerPoolRegistry, RegisteredWorker, WorkerState } from "./WorkerPoolRegistry";
import { AzureFinOpsGuard } from "./AzureFinOpsGuard";
import { UniversalRenderJob } from "./RenderQueueManager";

export interface AzureVmDetails {
  vmId: string;
  vmName: string;
  resourceGroup: string;
  region: string;
  sku: string;
  vCPU: number;
  memoryMb: number;
  osDiskType: string;
  publicIp: boolean;
  powerState: "Deallocated" | "Starting" | "Running" | "Deallocating" | "Stopped";
}

export class AzureWorkerManagerClass {
  private vmDetails: AzureVmDetails = {
    vmId: "vm-factoryos-render-prod-01",
    vmName: "factoryos-render-vm",
    resourceGroup: "factoryos-render-prod",
    region: "eastus2",
    sku: "Standard_B4ls_v2",
    vCPU: 4,
    memoryMb: 8192,
    osDiskType: "Standard_LRS",
    publicIp: false, // Outbound only
    powerState: "Deallocated",
  };

  private state: WorkerState = "DEALLOCATED";
  private gracePeriodMs: number = 10 * 60 * 1000; // 10 minutes default
  private drainingStartedAt?: number;
  private maxRenderDurationMs: number = 300 * 1000; // 5 minutes max render watchdog

  /**
   * Return current Azure VM power state & details.
   */
  public getVmDetails(): AzureVmDetails {
    return { ...this.vmDetails };
  }

  public getState(): WorkerState {
    return this.state;
  }

  /**
   * Request worker launch when render queue has jobs.
   */
  public requestStartVm(): { success: boolean; reason?: string } {
    // Check FinOps Lockdown
    const finopsCheck = AzureFinOpsGuard.canAcceptRenderJob("PRO");
    if (!finopsCheck.allowed) {
      return { success: false, reason: finopsCheck.reason };
    }

    if (this.state === "READY" || this.state === "BUSY") {
      return { success: true, reason: "VM is already running and ready." };
    }

    if (this.state === "DRAINING") {
      // Cancel deallocation grace period and return to active state
      this.state = "READY";
      this.drainingStartedAt = undefined;
      console.log("[AzureWorkerManager] New job arrived during DRAINING grace period. VM deallocation cancelled.");
      return { success: true, reason: "Grace period cancelled. Worker restored to READY." };
    }

    if (this.state === "DEALLOCATED" || this.state === "FAILED" || this.state === "LOST") {
      console.log(`[AzureWorkerManager] Starting Azure VM ${this.vmDetails.vmName} in RG ${this.vmDetails.resourceGroup}...`);
      this.state = "STARTING";
      this.vmDetails.powerState = "Starting";

      // Simulate VM Boot lifecycle
      setTimeout(() => {
        if (this.state === "STARTING") {
          this.state = "BOOTING";
          this.vmDetails.powerState = "Running";

          // Boot checks completed -> Register with WorkerPoolRegistry
          const workerEntry: RegisteredWorker = {
            workerId: "azure-b4ls-01",
            vendor: "azure",
            name: "Azure B4ls_v2 Ephemeral Worker",
            endpoint: "https://azure-worker-internal.factoryos.local",
            tokenHash: "token_azure_secure_hash_9981",
            capabilities: {
              vendor: "azure",
              architecture: "x86_64",
              vCPU: 4,
              memoryMb: 8192,
              ffmpegVersion: "FFmpeg 6.1.1",
              supportsGpu: false,
              maxConcurrentRenders: 1,
            },
            state: "READY",
            telemetry: {
              cpuUtilizationPct: 5.0,
              cpuCreditBalance: 1440,
              ramUtilizationPct: 22.0,
              activeRenders: 0,
              tempStorageFreeMb: 25600,
              b2Connectivity: true,
              lastHeartbeatTimestamp: Date.now(),
            },
            lastHeartbeat: new Date().toISOString(),
          };

          WorkerPoolRegistry.registerWorker(workerEntry);
          this.state = "READY";
          console.log("[AzureWorkerManager] Azure Worker booted, passed health checks, and registered READY.");
        }
      }, 50);

      return { success: true, reason: "VM start initiated." };
    }

    return { success: true, reason: `VM in transition state: ${this.state}` };
  }

  /**
   * Enter DRAINING state when queue depth becomes 0.
   */
  public enterDrainingState(): void {
    if (this.state === "READY" || this.state === "BUSY") {
      this.state = "DRAINING";
      this.drainingStartedAt = Date.now();
      console.log(`[AzureWorkerManager] Queue empty. Entering DRAINING state with 10-minute grace period.`);
    }
  }

  /**
   * Check grace period elapsed time and deallocate VM if expired.
   */
  public evaluateGracePeriod(overrideNowMs?: number): boolean {
    if (this.state !== "DRAINING" || !this.drainingStartedAt) {
      return false;
    }

    const now = overrideNowMs || Date.now();
    const elapsed = now - this.drainingStartedAt;

    if (elapsed >= this.gracePeriodMs) {
      console.log(`[AzureWorkerManager] Grace period expired (${elapsed}ms >= ${this.gracePeriodMs}ms). Deallocating VM...`);
      this.deallocateVm();
      return true;
    }
    return false;
  }

  /**
   * Instantly deallocate Azure VM (Compute cost stops).
   */
  public deallocateVm(): void {
    console.log(`[AzureWorkerManager] Deallocating VM ${this.vmDetails.vmName}...`);
    this.state = "DEALLOCATING";
    this.vmDetails.powerState = "Deallocating";

    WorkerPoolRegistry.unregisterWorker("azure-b4ls-01");

    setTimeout(() => {
      this.state = "DEALLOCATED";
      this.vmDetails.powerState = "Deallocated";
      this.drainingStartedAt = undefined;
      console.log("[AzureWorkerManager] Azure VM deallocated. Compute charges stopped.");
    }, 50);
  }

  /**
   * Emergency deallocation triggered by FinOps Guard / Lockdown.
   */
  public emergencyDeallocate(): void {
    console.warn("[AzureWorkerManager] EMERGENCY DEALLOCATION TRIGGERED!");
    this.deallocateVm();
  }

  /**
   * Set custom grace period for testing or config tuning.
   */
  public setGracePeriodMs(ms: number): void {
    this.gracePeriodMs = ms;
  }

  public reset(): void {
    this.state = "DEALLOCATED";
    this.vmDetails.powerState = "Deallocated";
    this.drainingStartedAt = undefined;
    WorkerPoolRegistry.unregisterWorker("azure-b4ls-01");
  }
}

export const AzureWorkerManager = new AzureWorkerManagerClass();
