/**
 * FactoryOS Frontier v2 — Global Runtime Gateway for Web & API Layer
 * Provides access to the authoritative AutonomousFactoryController, OverseerControlPlane,
 * and OverseerPresenceEngine across Next.js API routes and server components.
 */

import { AutonomousFactoryController } from "@/factoryos/core/controller/AutonomousFactoryController";
import * as path from "node:path";
import * as fs from "node:fs";

declare global {
  // eslint-disable-next-line no-var
  var __FACTORYOS_CONTROLLER_INSTANCE__: AutonomousFactoryController | undefined;
}

export async function getFactoryOSController(): Promise<AutonomousFactoryController> {
  if (global.__FACTORYOS_CONTROLLER_INSTANCE__) {
    return global.__FACTORYOS_CONTROLLER_INSTANCE__;
  }

  const storagePath = path.join(process.cwd(), "data", "factoryos_presence_runtime");
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  const controller = new AutonomousFactoryController({
    storageType: "disk",
    storagePath,
    patrolIntervalMs: 3000,
    supervisorIntervalMs: 4000,
    watchdogIntervalMs: 10000,
    autoStartSwarm: true,
  });

  await controller.boot();
  global.__FACTORYOS_CONTROLLER_INSTANCE__ = controller;
  return controller;
}
