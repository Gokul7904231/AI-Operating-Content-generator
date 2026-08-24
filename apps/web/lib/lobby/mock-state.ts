import { create } from "zustand";
import { FactoryState, ProductionJob, FactoryEvent, AttentionItem } from "./types";

export const initialFactoryState: FactoryState = {
  status: "ATTENTION_REQUIRED",
  floors: [
    {
      id: "01",
      name: "Strategy & Intelligence",
      shortCode: "STRATEGY",
      state: "READY",
      activeJobCount: 0,
      description: "Niche detection, audience calibration, and trend synthesis.",
      personnel: {
        guardian: { title: "Floor 01 Guardian", name: "Athena-1", status: "READY" },
        workersCount: 4,
        advisor: { title: "Trend Analyst", name: "Vanguard-AI", status: "MONITORING" },
        auditor: { title: "Strategy Auditor", name: "Audit-01", status: "READY" },
      },
      recentActivity: [
        "11:30 - Audience vector model refreshed for Science & Tech shorts",
        "11:15 - Strategic brief approved for quantum computing series",
      ],
    },
    {
      id: "02",
      name: "Scripting & Narrative",
      shortCode: "SCRIPT",
      state: "WORKING",
      activeJobCount: 2,
      description: "Hook optimization, pacing control, script synthesis & voice timing.",
      personnel: {
        guardian: { title: "Floor 02 Guardian", name: "Hermes-2", status: "ACTIVE" },
        workersCount: 8,
        advisor: { title: "Pacing Specialist", name: "Cadence-AI", status: "ACTIVE" },
        auditor: { title: "Narrative Auditor", name: "Logos-02", status: "MONITORING" },
      },
      recentActivity: [
        "11:41 - Hook strength score 94.2% calculated for Job #PRD-8821",
        "11:38 - Script payload passed to Voice Timing Engine",
      ],
    },
    {
      id: "03",
      name: "Asset Specification & Realization",
      shortCode: "ASSETS",
      state: "READY",
      activeJobCount: 1,
      description: "Visual prompts, B-roll selection, voice generation & audio cues.",
      personnel: {
        guardian: { title: "Floor 03 Guardian", name: "Daedalus-3", status: "READY" },
        workersCount: 6,
        advisor: { title: "Visual Stylist", name: "Palette-AI", status: "IDLE" },
        auditor: { title: "Asset Auditor", name: "Spec-03", status: "READY" },
      },
      recentActivity: [
        "11:40 - 12 visual prompts generated for Job #PRD-8820",
        "11:22 - ElevenLabs voice model loaded (Voice: Marcus-HQ)",
      ],
    },
    {
      id: "04",
      name: "Physical Media Synthesis",
      shortCode: "MEDIA",
      state: "ERROR",
      activeJobCount: 1,
      hasAttention: true,
      attentionCount: 1,
      description: "GPU rendering, frame composition, motion graphics & audio sync.",
      personnel: {
        guardian: { title: "Floor 04 Guardian", name: "Vulcan-4", status: "ERROR", note: "Scene rendering validation failed" },
        workersCount: 12,
        advisor: { title: "GPU Cluster Monitor", name: "Nvidia-SMI-Observer", status: "MONITORING" },
        auditor: { title: "Render Auditor", name: "PixelGuard-04", status: "ERROR" },
      },
      recentActivity: [
        "11:43 - Anomaly detected: Frame 142 audio offset 18ms over threshold",
        "11:44 - Healer assigned repair routine to Job #PRD-8819",
      ],
    },
    {
      id: "05",
      name: "Timeline Composition & Video Assembly",
      shortCode: "ASSEMBLY",
      state: "STANDBY",
      activeJobCount: 0,
      description: "Remotion timeline stitching, transition effects & subtitle burning.",
      personnel: {
        guardian: { title: "Floor 05 Guardian", name: "Chrono-5", status: "READY" },
        workersCount: 5,
        advisor: { title: "Assembly Master", name: "Stitch-AI", status: "IDLE" },
        auditor: { title: "Timeline Auditor", name: "Sync-05", status: "READY" },
      },
      recentActivity: [
        "11:35 - Assembly line standing by for Media Package from Floor 04",
      ],
    },
    {
      id: "06",
      name: "Distribution & Publishing Preparation",
      shortCode: "DISTRIBUTION",
      state: "CONCEPTUAL",
      isConceptual: true,
      activeJobCount: 0,
      description: "Multi-platform posting, hashtag optimization & analytics hooks.",
      personnel: {
        guardian: { title: "Floor 06 Guardian", name: "Mercury-6 (Conceptual)", status: "IDLE", note: "Not Operational" },
        workersCount: 0,
      },
      recentActivity: [
        "ARCHITECTURE STATUS: Floor 06 design phase only. Production capability not implemented.",
      ],
    },
    {
      id: "07",
      name: "Content Integrity & Compliance",
      shortCode: "COMPLIANCE",
      state: "READY",
      activeJobCount: 1,
      description: "Copyright verification, brand safety, NSFW check & platform policy compliance.",
      personnel: {
        guardian: { title: "Floor 07 Guardian", name: "Justitia-7", status: "READY" },
        workersCount: 3,
        advisor: { title: "Policy Checker", name: "Shield-AI", status: "ACTIVE" },
        auditor: { title: "Compliance Officer", name: "Veritas-07", status: "READY" },
      },
      recentActivity: [
        "11:45 - Compliance scan passed (Score: 99.8%) for Job #PRD-8818",
      ],
    },
  ],
  productions: [
    {
      id: "PRD-8819",
      title: "Why 90% of Brain Energy is Wasted",
      topic: "Neuroscience / Human Body",
      currentFloor: "Floor 04 · Physical Media Synthesis",
      floorId: "04",
      state: "BLOCKED",
      progressPct: 78,
      elapsedTime: "02m 14s",
      lastEvent: "Scene rendering validation failed at Frame 142",
      createdAt: "11:40:12",
      attentionState: {
        priority: "ERROR",
        title: "Scene Rendering Validation Failed",
        description: "Frame 142 audio offset exceeds safety threshold by +18ms during transition synthesis.",
        suggestedAction: "ReMaker investigating · Healer waiting for manual confirmation or auto-repair approval.",
      },
    },
    {
      id: "PRD-8821",
      title: "How Quantum Computers Hack Passwords",
      topic: "Cybersecurity & Physics",
      currentFloor: "Floor 02 · Scripting & Narrative",
      floorId: "02",
      state: "PROCESSING",
      progressPct: 42,
      elapsedTime: "00m 52s",
      lastEvent: "Generating 60-second retention-optimized script",
      createdAt: "11:41:40",
    },
    {
      id: "PRD-8820",
      title: "The Roman Empire's Secret Concrete Formula",
      topic: "Ancient History & Materials",
      currentFloor: "Floor 03 · Asset Specification",
      floorId: "03",
      state: "PROCESSING",
      progressPct: 65,
      elapsedTime: "01m 18s",
      lastEvent: "Visual prompts dispatched to image synthesis pipeline",
      createdAt: "11:40:55",
    },
    {
      id: "PRD-8818",
      title: "What Happens When Black Holes Collide?",
      topic: "Astrophysics",
      currentFloor: "Floor 07 · Content Integrity & Compliance",
      floorId: "07",
      state: "AWAITING_REVIEW",
      progressPct: 95,
      elapsedTime: "03m 45s",
      lastEvent: "Compliance verification complete — awaiting final export",
      createdAt: "11:38:10",
    },
  ],
  events: [
    {
      id: "EVT-109",
      timestamp: "11:45",
      sender: "Floor 07 Guardian",
      recipient: "Overseer",
      message: "Timeline validation passed for Job #PRD-8818.",
      severity: "success",
      floorId: "07",
      jobId: "PRD-8818",
    },
    {
      id: "EVT-108",
      timestamp: "11:44",
      sender: "Healer",
      recipient: "Overseer",
      message: "Repair routine initiated for Floor 04 render discrepancy.",
      severity: "warning",
      floorId: "04",
      jobId: "PRD-8819",
    },
    {
      id: "EVT-107",
      timestamp: "11:43",
      sender: "Slayer",
      recipient: "Overseer",
      message: "Floor 04 anomaly detected: frame audio offset threshold exceeded.",
      severity: "error",
      floorId: "04",
      jobId: "PRD-8819",
    },
    {
      id: "EVT-106",
      timestamp: "11:42",
      sender: "Floor 04",
      recipient: "Floor 05",
      message: "Media package payload transfer initiated.",
      severity: "info",
      floorId: "04",
    },
    {
      id: "EVT-105",
      timestamp: "11:41",
      sender: "Floor 02",
      recipient: "Floor 03",
      message: "Script & voice timing asset contract verified.",
      severity: "info",
      floorId: "02",
    },
  ],
  attention: [
    {
      id: "ATT-001",
      priority: "ERROR",
      floorId: "04",
      floorName: "Floor 04 · Physical Media Synthesis",
      jobId: "PRD-8819",
      jobTitle: "Why 90% of Brain Energy is Wasted",
      title: "Scene Rendering Validation Failed",
      description: "Frame 142 audio offset exceeds safety threshold by +18ms during transition synthesis.",
      suggestedAction: "ReMaker investigating · Healer waiting for manual confirmation or auto-repair approval.",
      involvedRoles: ["ReMaker", "Healer", "Floor 04 Guardian"],
      timestamp: "11:43:10",
      resolved: false,
    },
  ],
  overseer: {
    headline: "1 floor requires operational intervention.",
    status: "ATTENTION",
    activeProductionsCount: 4,
    floorsAwaitingReviewCount: 1,
    criticalFailuresCount: 0,
    recoveredJobsCount: 12,
    activeWorkersCount: 28,
    lastAuditTimestamp: "11:44:30",
    recentDecisions: [
      {
        id: "DEC-501",
        timestamp: "11:44:15",
        decision: "Dispatched Healer agent to inspect Floor 04 frame drift.",
        actor: "Overseer",
      },
      {
        id: "DEC-500",
        timestamp: "11:38:00",
        decision: "Approved production request PRD-8818 for automated compliance check.",
        actor: "Overseer",
      },
    ],
  },
};

interface LobbyStoreState {
  factoryState: FactoryState;
  selectedFloorId: string | null;
  selectedJobId: string | null;
  isOverseerDrawerOpen: boolean;
  isAttentionDrawerOpen: boolean;
  activeTab: "Lobby" | "Productions" | "Factory" | "Reports";
  
  // Actions (Prototype Local Only!)
  selectFloor: (floorId: string | null) => void;
  selectJob: (jobId: string | null) => void;
  setOverseerDrawerOpen: (open: boolean) => void;
  setAttentionDrawerOpen: (open: boolean) => void;
  setActiveTab: (tab: "Lobby" | "Productions" | "Factory" | "Reports") => void;
  
  // Prototype simulation action (NO REAL API CALLS)
  submitProductionInstruction: (input: { topic: string; brief?: string; type?: string }) => void;
  resolveAttentionItem: (attentionId: string) => void;
}

export const useLobbyStore = create<LobbyStoreState>((set, get) => ({
  factoryState: initialFactoryState,
  selectedFloorId: null,
  selectedJobId: null,
  isOverseerDrawerOpen: false,
  isAttentionDrawerOpen: false,
  activeTab: "Lobby",

  selectFloor: (floorId) => set({ selectedFloorId: floorId }),
  selectJob: (jobId) => set({ selectedJobId: jobId }),
  setOverseerDrawerOpen: (open) => set({ isOverseerDrawerOpen: open }),
  setAttentionDrawerOpen: (open) => set({ isAttentionDrawerOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  submitProductionInstruction: ({ topic, brief }) => {
    const state = get().factoryState;
    const newId = `PRD-${Math.floor(8822 + Math.random() * 1000)}`;
    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 5);

    const newJob: ProductionJob = {
      id: newId,
      title: topic,
      topic: brief || "User Command Request",
      currentFloor: "Floor 01 · Strategy & Intelligence",
      floorId: "01",
      state: "QUEUED",
      progressPct: 5,
      elapsedTime: "00m 02s",
      lastEvent: "Production request registered in factory queue",
      createdAt: timeStr,
    };

    const newEvent: FactoryEvent = {
      id: `EVT-${Math.floor(110 + Math.random() * 1000)}`,
      timestamp: timeStr,
      sender: "Production Command",
      recipient: "Floor 01 Guardian",
      message: `Production request "${topic.substring(0, 35)}..." accepted into pipeline.`,
      severity: "info",
      floorId: "01",
      jobId: newId,
    };

    set({
      factoryState: {
        ...state,
        productions: [newJob, ...state.productions],
        events: [newEvent, ...state.events],
        overseer: {
          ...state.overseer,
          activeProductionsCount: state.overseer.activeProductionsCount + 1,
        },
      },
    });
  },

  resolveAttentionItem: (attentionId) => {
    const state = get().factoryState;
    const updatedAttention = state.attention.map((item) =>
      item.id === attentionId ? { ...item, resolved: true } : item
    );

    const activeAttention = updatedAttention.filter((a) => !a.resolved);
    const newStatus = activeAttention.length === 0 ? "NORMAL" : "ATTENTION_REQUIRED";

    // Update Floor 04 state to WORKING if attention resolved
    const updatedFloors = state.floors.map((f) => {
      if (f.id === "04" && activeAttention.length === 0) {
        return {
          ...f,
          state: "WORKING" as const,
          hasAttention: false,
          attentionCount: 0,
          personnel: {
            ...f.personnel,
            guardian: { ...f.personnel.guardian, status: "ACTIVE" as const, note: undefined },
            auditor: { ...f.personnel.auditor!, status: "READY" as const },
          },
        };
      }
      return f;
    });

    const updatedJobs = state.productions.map((j) => {
      if (j.id === "PRD-8819" && activeAttention.length === 0) {
        return {
          ...j,
          state: "PROCESSING" as const,
          lastEvent: "Healer auto-repair complete. Frame audio re-synced.",
          attentionState: undefined,
        };
      }
      return j;
    });

    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 5);

    const resolveEvent: FactoryEvent = {
      id: `EVT-${Math.floor(200 + Math.random() * 1000)}`,
      timestamp: timeStr,
      sender: "Healer",
      recipient: "Overseer",
      message: `Attention item #${attentionId} resolved. Floor 04 rendering pipeline resumed.`,
      severity: "success",
      floorId: "04",
      jobId: "PRD-8819",
    };

    set({
      factoryState: {
        ...state,
        status: newStatus,
        floors: updatedFloors,
        productions: updatedJobs,
        attention: updatedAttention,
        events: [resolveEvent, ...state.events],
        overseer: {
          ...state.overseer,
          headline: activeAttention.length === 0 ? "All factory floors running normally." : state.overseer.headline,
          status: activeAttention.length === 0 ? "OPTIMAL" : "ATTENTION",
          recoveredJobsCount: state.overseer.recoveredJobsCount + 1,
        },
      },
    });
  },
}));
