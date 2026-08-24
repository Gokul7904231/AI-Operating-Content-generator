export interface ComponentHealth {
  status: "healthy" | "degraded" | "unhealthy";
  error?: string;
  lastChecked: string;
}

export interface ComponentMetrics {
  [key: string]: any;
}

export interface RuntimeComponent {
  id: string;
  version: string;
  health(): Promise<ComponentHealth>;
  metrics(): Promise<ComponentMetrics>;
  shutdown(): Promise<void>;
}
