import { CheckpointDB } from "./CheckpointDB";

export interface GraphNode {
  id: string;
  type: string;
  label?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export const KnowledgeGraph = {
  /**
   * Record a relation between two entities in the execution graph.
   */
  record(subject: string, relation: string, object: string) {
    console.log(`[KnowledgeGraph] Recording: ${subject} --[${relation}]--> ${object}`);
    CheckpointDB.recordRelation(subject, relation, object);
  },

  /**
   * Automatically graph a full generation job execution node chain.
   */
  graphJob(params: {
    jobId: string;
    workflowId: string;
    engineId: string;
    promptId?: string;
    modelId?: string;
    providerId?: string;
    outputAssetId?: string;
  }) {
    const { jobId, workflowId, engineId, promptId, modelId, providerId, outputAssetId } = params;

    // Core hierarchy relations
    this.record(jobId, "runs_workflow", workflowId);
    this.record(workflowId, "executes_engine", engineId);

    if (promptId) {
      this.record(jobId, "uses_prompt", promptId);
    }
    if (modelId) {
      this.record(engineId, "queries_model", modelId);
      if (providerId) {
        this.record(modelId, "hosted_on", providerId);
      }
    }
    if (outputAssetId) {
      this.record(jobId, "generates_asset", outputAssetId);
    }
  },

  /**
   * Retrieve all recorded nodes and edges connected to a subject (or all if empty).
   */
  getGraph(subjectId?: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const relations = CheckpointDB.getRelations(subjectId);
    const nodeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    for (const rel of relations) {
      nodeSet.add(rel.subject_id);
      nodeSet.add(rel.object_id);
      edges.push({
        source: rel.subject_id,
        target: rel.object_id,
        relation: rel.relation,
      });
    }

    const nodes: GraphNode[] = Array.from(nodeSet).map((id) => {
      let type = "unknown";
      if (id.startsWith("job_")) type = "Job";
      else if (id.startsWith("asset_")) type = "Asset";
      else if (id.startsWith("model_") || id.includes("/")) type = "Model";
      else if (id.startsWith("workflow_") || id.startsWith("quiz") || id.startsWith("story")) type = "Workflow";
      else if (id.startsWith("google") || id.startsWith("groq") || id.startsWith("nvidia")) type = "Provider";
      else type = "Entity";

      return { id, type };
    });

    return { nodes, edges };
  },
};
export default KnowledgeGraph;
