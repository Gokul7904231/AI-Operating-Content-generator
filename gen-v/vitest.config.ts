/**
 * Vitest configuration for FactoryOS tests.
 *
 * Scoped to factoryos/tests/ only — does not run ShortsFactory tests.
 * Uses Node environment (no browser, no DOM).
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["factoryos/tests/**/*.test.ts"],
    environment: "node",
    globals: false,
    reporters: ["verbose"],
    testTimeout: 30000,
  },
});
