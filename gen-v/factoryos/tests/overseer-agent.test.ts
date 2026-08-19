import { describe, it, expect } from "vitest";
import { OverseerAgent } from "../../lib/overseer/agent";
import { AdminUser } from "../../lib/auth/types";

describe("FactoryOS Overseer — Agent Loop & Execution Budget Suite", () => {
  const user: AdminUser = {
    uid: "usr_editor_1",
    email: "creator@factoryos.pro",
    role: "EDITOR",
    active: true,
    disabled: false,
    createdAt: "2026-08-14T00:00:00Z",
    updatedAt: "2026-08-14T00:00:00Z",
  };

  it("01: Runs agent loop with bounded tool steps and returns traces", async () => {
    const result = await OverseerAgent.run("Show my active renders and jobs", user, "OPERATE");

    expect(result.mode).toBe("OPERATE");
    expect(result.userRole).toBe("EDITOR");
    expect(result.traces.length).toBeGreaterThan(0);
    expect(result.traces[0].status).toBe("EXECUTED");
  });

  it("02: Triggers action confirmation request for high-risk write requests", async () => {
    const result = await OverseerAgent.run("Create a video about quantum computing", user, "CREATE");

    expect(result.confirmationRequest).toBeDefined();
    expect(result.confirmationRequest?.toolId).toBe("createVideo");
    expect(result.confirmationRequest?.status).toBe("PENDING");
    expect(result.traces[0].status).toBe("CONFIRMATION_REQUIRED");
  });
});
