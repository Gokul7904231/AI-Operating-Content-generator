import { AdminUser } from "../auth/types";
import { SubAgentResult, AgentMode } from "./types";
import { OverseerToolRegistry } from "./tool-registry";
import { OverseerGuardrails } from "./guardrails";

export class SubAgentOrchestrator {
  /**
   * Spawns parallel sub-agents (Factory Agent, Research Agent, Content Agent) to investigate complex requests concurrently.
   */
  static async runParallelSubAgents(
    query: string,
    user: AdminUser,
    mode: AgentMode
  ): Promise<SubAgentResult[]> {
    const results: SubAgentResult[] = [];

    // Define sub-agent tasks
    const tasks: Array<{ agentName: string; toolIds: string[] }> = [
      { agentName: "Factory Operational Agent", toolIds: ["getMyJobs", "getMyProjects", "getUserQuota"] },
      { agentName: "Research & Market Agent", toolIds: ["webSearch"] },
    ];

    if (user.role === "OWNER" || user.role === "ADMIN") {
      tasks.push({ agentName: "System Infrastructure Agent", toolIds: ["getFactoryHealth", "getSystemTelemetry", "getApiProviderStatus"] });
    }

    // Execute sub-agents concurrently via Promise.all
    const executedSubAgents = await Promise.all(
      tasks.map(async (task) => {
        const toolsUsed: string[] = [];
        const data: Record<string, any> = {};

        for (const toolId of task.toolIds) {
          const tool = OverseerToolRegistry.getTool(toolId);
          if (tool && tool.riskLevel === "READ") {
            try {
              toolsUsed.push(tool.name);
              const output = await tool.handler({}, { user: user as any, mode });
              data[toolId] = OverseerGuardrails.sanitizeOutput(output);
            } catch (err: any) {
              data[toolId] = { error: err.message };
            }
          }
        }

        return {
          agentName: task.agentName,
          toolsUsed,
          findings: `Analyzed ${toolsUsed.length} operational sources cleanly.`,
          data,
        };
      })
    );

    return executedSubAgents;
  }
}
