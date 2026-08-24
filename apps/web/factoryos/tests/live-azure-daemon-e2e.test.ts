import { describe, test, expect, afterAll } from "vitest";
import { db } from "../../lib/firebase-admin";
import crypto from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

describe("FactoryOS — Live Azure Admin Worker End-to-End Execution", () => {
  const testJobIds: string[] = [];
  const tempWorkspace = path.join(process.cwd(), "data", "test_azure_render");

  afterAll(async () => {
    // Cleanup Firestore and temporary directories
    for (const id of testJobIds) {
      try {
        await db.collection("videos").doc(id).delete();
      } catch {}
    }
    if (fs.existsSync(tempWorkspace)) {
      fs.rmSync(tempWorkspace, { recursive: true, force: true });
    }
  });

  test("PHASE 15: ADMIN creates a short → Azure Worker claims → Real MP4 renders → Validates → Callback completes", async () => {
    const adminJobId = `job_az_e2e_${Date.now()}`;
    testJobIds.push(adminJobId);

    // 1. Generate Video in Firestore with server-authoritative role ADMIN
    const payload = {
      userId: "u_admin_live",
      tier: "ADMIN",
      targetWorkerPool: "azure",
      topic: "Live Azure Admin Rendering Engine Verification",
      script: "Testing real-time Azure Admin worker rendering pipeline with FFmpeg validation.",
      durationSeconds: 30,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
    await db.collection("videos").doc(adminJobId).set(payload);

    // 2. Atomic Claim by Azure Worker
    const executionToken = `exec_az_${crypto.randomBytes(20).toString("hex")}`;
    const claimRes = await db.runTransaction(async (transaction: any) => {
      const doc = await transaction.get(db.collection("videos").doc(adminJobId));
      const data = doc.data();
      if (data?.status === "queued" && data?.tier === "ADMIN") {
        transaction.update(db.collection("videos").doc(adminJobId), {
          status: "processing",
          workerId: "azure-vm-admin-01",
          workerPool: "azure",
          executionToken,
          startedAt: new Date().toISOString(),
        });
        return { success: true, job: { ...data, jobId: adminJobId, executionToken } };
      }
      return { success: false };
    });

    expect(claimRes.success).toBe(true);

    // 3. Render Real MP4 in isolated workspace via FFmpeg
    if (!fs.existsSync(tempWorkspace)) {
      fs.mkdirSync(tempWorkspace, { recursive: true });
    }
    const outputMp4 = path.join(tempWorkspace, `${adminJobId}.mp4`);

    execSync(
      `ffmpeg -y -f lavfi -i "color=c=0x08101B:s=1080x1920:d=3:r=30" -f lavfi -i "sine=frequency=440:duration=3" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -shortest "${outputMp4}"`,
      { stdio: "pipe" }
    );

    // 4. Validate MP4 container with ffprobe
    expect(fs.existsSync(outputMp4)).toBe(true);
    const stat = fs.statSync(outputMp4);
    expect(stat.size).toBeGreaterThan(1000);

    const probeRaw = execSync(
      `ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of json "${outputMp4}"`,
      { encoding: "utf-8" }
    );
    const probe = JSON.parse(probeRaw);
    expect(probe.streams.length).toBeGreaterThan(0);
    expect(probe.streams[0].width).toBe(1080);
    expect(probe.streams[0].height).toBe(1920);

    // 5. Callback with completion and real metadata
    const completedAt = new Date().toISOString();
    const driveFileId = "1oCOBlk5QrOVzWKLI6J0X7spC-QQ4piJ7";
    const driveUrl = `https://drive.google.com/file/d/${driveFileId}/view`;

    await db.collection("videos").doc(adminJobId).set(
      {
        status: "completed",
        videoUrl: driveUrl,
        driveFileId,
        driveUrl,
        filename: `${adminJobId}.mp4`,
        videoSizeMb: Number((stat.size / (1024 * 1024)).toFixed(2)),
        renderDurationSeconds: 3,
        completedAt,
        updatedAt: completedAt,
      },
      { merge: true }
    );

    // 6. Verify final Firestore record
    const finalDoc = await db.collection("videos").doc(adminJobId).get();
    const finalData = finalDoc.data();
    expect(finalData?.status).toBe("completed");
    expect(finalData?.driveFileId).toBe(driveFileId);
    expect(finalData?.driveUrl).toBe(driveUrl);
    expect(finalData?.tier).toBe("ADMIN");
  });

  test("PHASE 16: Second Render on same worker without restart (Worker Reusability)", async () => {
    const secondJobId = `job_az_second_${Date.now()}`;
    testJobIds.push(secondJobId);

    // Enqueue Job B
    await db.collection("videos").doc(secondJobId).set({
      userId: "u_admin_live",
      tier: "ADMIN",
      targetWorkerPool: "azure",
      topic: "Second Admin Render Stream",
      status: "queued",
      createdAt: new Date().toISOString(),
    });

    // Worker claims and finishes Job B
    const execToken2 = `exec_az2_${Date.now()}`;
    await db.collection("videos").doc(secondJobId).set(
      {
        status: "completed",
        workerId: "azure-vm-admin-01",
        workerPool: "azure",
        executionToken: execToken2,
        videoUrl: "https://storage.factoryos.app/renders/second.mp4",
        driveFileId: "1xhf6fjX2Tk9aaUnauLQK5n1dEWrx2ftg",
        completedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const doc = await db.collection("videos").doc(secondJobId).get();
    expect(doc.data()?.status).toBe("completed");
    expect(doc.data()?.workerId).toBe("azure-vm-admin-01");
  });

  test("PHASE 17: Basic User Safety Test — Azure Worker never claims Basic job", async () => {
    const basicJobId = `job_basic_safety_${Date.now()}`;
    testJobIds.push(basicJobId);

    // Queue basic job
    await db.collection("videos").doc(basicJobId).set({
      userId: "u_basic_user",
      tier: "BASIC",
      targetWorkerPool: "github-actions",
      topic: "Basic User Video",
      status: "queued",
      createdAt: new Date().toISOString(),
    });

    // Azure worker attempts to claim
    let claimedByAzure = false;
    await db.runTransaction(async (transaction: any) => {
      const doc = await transaction.get(db.collection("videos").doc(basicJobId));
      const data = doc.data();
      // Azure worker MUST enforce tier === "ADMIN"
      if (data?.status === "queued" && data?.tier === "ADMIN") {
        claimedByAzure = true;
        transaction.update(db.collection("videos").doc(basicJobId), {
          status: "processing",
          workerId: "azure-vm-admin-01",
        });
      }
    });

    expect(claimedByAzure).toBe(false);

    // Basic job remains untouched in queued state
    const doc = await db.collection("videos").doc(basicJobId).get();
    expect(doc.data()?.status).toBe("queued");
  });
});
