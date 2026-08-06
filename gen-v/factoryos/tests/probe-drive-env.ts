import { describe, it, expect } from "vitest";
import { GoogleDriveStorageProvider } from "../../storage/providers/google-drive";

describe("Phase 1 — Google Drive Credential Audit", () => {
  it("inspects Google Drive authentication configuration and performs diagnostic check", async () => {
    console.log("=================================================");
    console.log("GOOGLE DRIVE CREDENTIAL & CONFIGURATION AUDIT");
    console.log("=================================================");

    const appCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS ? "PRESENT" : "MISSING";
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID ? "PRESENT" : "MISSING";
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET ? "PRESENT" : "MISSING";
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN ? "PRESENT" : "MISSING";
    const folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) ? "PRESENT" : "MISSING";

    console.log("GOOGLE_APPLICATION_CREDENTIALS =", appCreds);
    console.log("GOOGLE_DRIVE_CLIENT_ID         =", clientId);
    console.log("GOOGLE_DRIVE_CLIENT_SECRET     =", clientSecret);
    console.log("GOOGLE_DRIVE_REFRESH_TOKEN     =", refreshToken);
    console.log("GOOGLE_DRIVE_FOLDER_ID         =", folderId);

    let authMethod = "NONE";
    if (appCreds === "PRESENT") {
      authMethod = "Service Account (GOOGLE_APPLICATION_CREDENTIALS)";
    } else if (clientId === "PRESENT" && clientSecret === "PRESENT" && refreshToken === "PRESENT") {
      authMethod = "OAuth2 Refresh Token (GOOGLE_DRIVE_CLIENT_ID + SECRET + REFRESH_TOKEN)";
    }

    console.log("Configured Auth Method         =", authMethod);
    console.log("=================================================");

    // Attempt provider initialization & health check
    const provider = new GoogleDriveStorageProvider();
    const isHealthy = await provider.health();
    console.log("Drive Provider Health Check    =", isHealthy ? "PASS" : "FAIL (Unconfigured Credentials)");

    expect(provider).toBeDefined();
  });
});
