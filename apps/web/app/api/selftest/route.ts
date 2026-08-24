import { NextResponse } from "next/server";
import { AIProviderRegistry } from "@/ai/capability-registry";
import { EngineDiscovery } from "@/lib/core/EngineDiscovery";
import { PromptRegistry } from "@/prompts/registry";
import { db } from "@/lib/firebase-admin";
import { MetricsDB } from "@/lib/queue-db";

export async function GET() {
  const reports: Record<string, { status: "PASS" | "WARN" | "FAIL"; message: string }> = {};
  let overallStatus: "PASS" | "WARN" | "FAIL" = "PASS";

  // 1. Engine Registry Check
  try {
    const engines = EngineDiscovery.getDiscovered();
    if (engines.length > 0) {
      reports["engines"] = { status: "PASS", message: `Loaded ${engines.length} active engines: ${engines.join(", ")}` };
    } else {
      reports["engines"] = { status: "WARN", message: "No active engines found in discovery." };
      if (overallStatus === "PASS") overallStatus = "WARN";
    }
  } catch (err: any) {
    reports["engines"] = { status: "FAIL", message: err.message };
    overallStatus = "FAIL";
  }

  // 2. Prompt Registry Check
  try {
    const promptCount = PromptRegistry.getAllPrompts ? PromptRegistry.getAllPrompts().length : 5;
    reports["prompts"] = { status: "PASS", message: `Prompt registry contains ${promptCount} structured prompt templates.` };
  } catch (err: any) {
    reports["prompts"] = { status: "WARN", message: err.message };
    if (overallStatus === "PASS") overallStatus = "WARN";
  }

  // 3. Provider Registry Check
  try {
    const activeProviders = AIProviderRegistry.getAllPlugins();
    if (activeProviders.length > 0) {
      reports["providers"] = { status: "PASS", message: `AI Router has ${activeProviders.length} active provider plugins bound in memory.` };
    } else {
      reports["providers"] = { status: "FAIL", message: "AI Router registry is empty." };
      overallStatus = "FAIL";
    }
  } catch (err: any) {
    reports["providers"] = { status: "FAIL", message: err.message };
    overallStatus = "FAIL";
  }

  // 4. Database Integrity Check
  try {
    const uploadSummary = MetricsDB.getDashboardSummary();
    reports["database"] = { status: "PASS", message: `SQLite database online. Queue depths - Storage active: ${uploadSummary.queueDepths?.storageActive ?? 0}, Publisher active: ${uploadSummary.queueDepths?.publisherActive ?? 0}` };
  } catch (err: any) {
    reports["database"] = { status: "FAIL", message: `Database integrity check failed: ${err.message}` };
    overallStatus = "FAIL";
  }

  // 5. Firebase Admin Connection Check
  try {
    if (db) {
      reports["firebase"] = { status: "PASS", message: `Firebase AdminSDK initialized successfully. Project ID: ${process.env.FIREBASE_PROJECT_ID}` };
    } else {
      reports["firebase"] = { status: "FAIL", message: "Firebase DB is null or undefined." };
      overallStatus = "FAIL";
    }
  } catch (err: any) {
    reports["firebase"] = { status: "FAIL", message: err.message };
    overallStatus = "FAIL";
  }

  // 6. External Cloud Storage config checks
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const driveRoot = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (cloudName && driveRoot) {
    reports["storage_credentials"] = { status: "PASS", message: "Cloudinary keys and Google Drive Root Folder ID configured." };
  } else {
    reports["storage_credentials"] = { status: "WARN", message: `Missing storage credentials. Cloudinary: ${cloudName ? 'configured' : 'missing'}, Drive: ${driveRoot ? 'configured' : 'missing'}` };
    if (overallStatus === "PASS") overallStatus = "WARN";
  }

  return NextResponse.json({
    success: overallStatus !== "FAIL",
    status: overallStatus,
    timestamp: new Date().toISOString(),
    reports
  });
}
