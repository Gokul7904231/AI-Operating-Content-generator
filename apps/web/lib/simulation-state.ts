/**
 * Simulation State Registry
 *
 * Stores active SRE chaos simulator control flags in memory.
 * Shared between NextJS API routers and background queue workers.
 */

export interface SimulationState {
  paused: boolean;
  speed: number;
  injectFailure: "drive_403" | "groq_429" | "db_lock" | "render_crash" | null;
}

class SimulationRegistryClass {
  state: SimulationState = {
    paused: false,
    speed: 1,
    injectFailure: null,
  };

  update(patch: Partial<SimulationState>): void {
    this.state = { ...this.state, ...patch };
    console.log(`[SimulationRegistry] Updated state:`, JSON.stringify(this.state));
  }
}

export const SimulationRegistry = new SimulationRegistryClass();
