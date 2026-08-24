/**
 * Workflow Runtime Exports
 *
 * Backwards-compatibility wrapper for content engine modules.
 */

export * from "./workflow-runtime";
import { WorkflowRuntime } from "./workflow-runtime";

// Backward compatibility default export
export const EngineRuntime = WorkflowRuntime;
export default WorkflowRuntime;
