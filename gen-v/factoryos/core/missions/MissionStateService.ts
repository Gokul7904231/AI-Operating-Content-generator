/**
 * FactoryOS Frontier v3 — MissionStateService
 * Canonical Authoritative Source of Truth for Video Creation & Render Job Status
 */

import { db } from "@/lib/firebase-admin";
import { EvidenceFactory, EvidenceRecord } from "../contracts/EvidenceRecord";

export interface UserMissionSummary {
  userId: string;
  activeMissionsCount: number;
  completedVideosCount: number;
  latestMission?: {
    id: string;
    title: string;
    status: string;
    progressPct: number;
    updatedAt: string;
  };
}

export class MissionStateService {
  private static instance: MissionStateService;

  static getInstance(): MissionStateService {
    if (!this.instance) {
      this.instance = new MissionStateService();
    }
    return this.instance;
  }

  /**
   * Retrieves authoritative mission and video creation state for a specific authenticated user.
   */
  async getUserMissionStatus(userId: string): Promise<EvidenceRecord<UserMissionSummary>> {
    const startTime = Date.now();

    if (!userId) {
      return EvidenceFactory.create<UserMissionSummary>(
        "MISSION",
        "MissionStateService",
        "ERROR",
        { userId: "", activeMissionsCount: 0, completedVideosCount: 0 },
        { error: "User ID is required to query video status." }
      );
    }

    try {
      // Query real jobs from Firestore
      const jobsSnapshot = await db
        .collection("jobs")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const docs = jobsSnapshot.docs;
      const activeJobs = docs.filter(d => {
        const status = d.data().status;
        return ["QUEUED", "GENERATING", "RENDERING", "UPLOADING"].includes(status);
      });

      const completedJobs = docs.filter(d => d.data().status === "COMPLETED");
      const latestDoc = docs[0]?.data();

      const summary: UserMissionSummary = {
        userId,
        activeMissionsCount: activeJobs.length,
        completedVideosCount: completedJobs.length,
        latestMission: latestDoc ? {
          id: docs[0].id,
          title: latestDoc.topic || latestDoc.title || "Video Short",
          status: latestDoc.status || "UNKNOWN",
          progressPct: latestDoc.progress || (latestDoc.status === "COMPLETED" ? 100 : 0),
          updatedAt: latestDoc.updatedAt || latestDoc.createdAt || new Date().toISOString(),
        } : undefined,
      };

      const state = docs.length === 0 ? "EMPTY" : "SUCCESS";

      return EvidenceFactory.create<UserMissionSummary>(
        "MISSION",
        "MissionStateService:Firestore",
        state,
        summary,
        {
          claims: [
            `Active missions: ${summary.activeMissionsCount}`,
            `Completed videos: ${summary.completedVideosCount}`,
          ],
          metadata: { latencyMs: Date.now() - startTime }
        }
      );
    } catch (err: any) {
      // If Firestore is unconfigured/offline in local dev mode, return truthful EMPTY/UNAVAILABLE state
      return EvidenceFactory.create<UserMissionSummary>(
        "MISSION",
        "MissionStateService",
        "EMPTY",
        {
          userId,
          activeMissionsCount: 0,
          completedVideosCount: 0,
        },
        {
          claims: ["No active jobs or database query offline."],
          metadata: { latencyMs: Date.now() - startTime }
        }
      );
    }
  }
}
