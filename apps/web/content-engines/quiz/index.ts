import { WorkflowLoader } from "../_loader";

WorkflowLoader.register({
  id: "quiz",
  name: "Quiz Engine",
  version: "1.0",
  renderProfile: "FAST_QUIZ",
  workflowVersion: "v1",
  hookPromptSlug: "hook:v1",
  scenePromptSlug: "scene:v1",
  voicePromptSlug: "hook:v1", // stub
  metadataPromptSlug: "critic:v1", // stub
  steps: [
    { id: "script", enabled: true, dependsOn: [], retry: 2 },
    { id: "critic", enabled: true, dependsOn: ["script"], approvalRequired: false },
    { id: "scene", enabled: true, dependsOn: ["script"] },
    { id: "voice", enabled: true, dependsOn: ["scene"] },
    { id: "image", enabled: true, dependsOn: ["scene"], timeout: 30000 },
    { id: "render", enabled: true, dependsOn: ["voice", "image"] },
    { id: "upload", enabled: true, dependsOn: ["render"] },
    { id: "publish", enabled: true, dependsOn: ["upload"] }
  ]
});
