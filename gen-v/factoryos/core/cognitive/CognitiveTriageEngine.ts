/**
 * FactoryOS Frontier v2 — Cognitive Triage Engine
 * Classifies incident complexity and routes reasoning to the appropriate cognitive tier.
 */

import type { IncidentContext, CognitiveComplexityLevel } from "./CognitiveDecisionContext";

export class CognitiveTriageEngine {
  /**
   * Evaluates the complexity level of an incident.
   */
  triageIncident(incident: IncidentContext): CognitiveComplexityLevel {
    // 1. Conflicting Claims -> MULTI_AGENT / Contradiction Resolution
    if (incident.conflictingClaims && incident.conflictingClaims.length >= 2) {
      return "MULTI_AGENT";
    }

    // 2. Large Context / Ambiguous History -> RLM
    const totalLogLength = (incident.rawLogs || []).reduce((acc, log) => acc + log.length, 0);
    if (totalLogLength > 3000 || incident.symptoms.length > 5) {
      return "RLM";
    }

    // 3. High Risk / Critical Candidates / High Severity -> DELIBERATE
    const hasHighRiskAction = (incident.candidateActions || []).some(
      (a) => a.riskLevel === "HIGH" || a.riskLevel === "CRITICAL"
    );
    if (incident.severity === "CRITICAL" || incident.severity === "HIGH" || hasHighRiskAction) {
      return "DELIBERATE";
    }

    // 4. Low Severity with multiple symptoms -> FAST
    if (incident.symptoms.length > 1) {
      return "FAST";
    }

    // 5. Default single symptom / routine -> DETERMINISTIC
    return "DETERMINISTIC";
  }
}
