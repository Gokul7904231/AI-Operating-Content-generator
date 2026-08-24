/**
 * Storage Layer — Bootstrap
 *
 * Registers all storage providers with the StorageRegistry at startup.
 * Import this file once in your application entry point (e.g. app/providers.tsx
 * or any server-side initialization file).
 *
 * Mirrors the AI provider factory pattern.
 */

import { StorageRegistry } from "./storage-registry";
import { GoogleDriveProvider } from "./providers/google-drive";
import { CloudinaryProvider } from "./providers/cloudinary";
import { StorageQueue } from "./upload-queue";

let initialized = false;

export function initStorageProviders(): void {
  if (initialized) return;
  initialized = true;

  console.log("[Storage] Bootstrapping storage providers...");

  // Register Google Drive (becomes primary by default)
  StorageRegistry.register(GoogleDriveProvider);

  // Register Cloudinary (secondary)
  StorageRegistry.register(CloudinaryProvider);

  // Allow env override for primary provider
  const envPrimary = process.env.PRIMARY_STORAGE_PROVIDER;
  if (envPrimary && StorageRegistry.hasProvider(envPrimary)) {
    StorageRegistry.setPrimary(envPrimary);
  }

  console.log(
    `[Storage] Registered providers: ${StorageRegistry.getProviderIds().join(", ")}`
  );
  console.log(`[Storage] Primary provider: ${StorageRegistry.getPrimary().id}`);

  // StorageQueue auto-starts on import and subscribes to render.completed events
  console.log(`[Storage] Upload queue: ready | concurrency ${process.env.STORAGE_QUEUE_CONCURRENCY ?? 2}`);
}

// Auto-initialize on import (safe — guarded by flag)
initStorageProviders();

export {
  StorageRegistry,
  GoogleDriveProvider,
  CloudinaryProvider,
  StorageQueue,
};
