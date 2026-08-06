import { QuizOutputValidationResult } from "./QuizOutputValidator";
import { QuizDuplicateCheckResult } from "./QuizDuplicateDetector";
import { QuizAmbiguityCheckResult } from "./QuizAmbiguityDetector";
import { QuizFactualityCheckResult } from "./QuizEvidenceVerifier";
import { SemanticOptionValidationResult } from "./ambiguity/SemanticOptionValidator";

export type QuizGuardianDecision = "PASS" | "REPAIR" | "REJECT";

export interface QuizQualityReportData {
  quizTitle: string;
  totalQuestions: number;
  decision: QuizGuardianDecision;
  overallScore: number;
  structureScore: number;
  uniquenessScore: number;
  ambiguityScore: number;
  semanticScore: number;
  factualityScore: number;
  summaryReasons: string[];
  structureValidation: QuizOutputValidationResult;
  duplicateCheck: QuizDuplicateCheckResult;
  ambiguityCheck: QuizAmbiguityCheckResult;
  semanticOptionValidation?: SemanticOptionValidationResult;
  factualityCheck: QuizFactualityCheckResult;
  timestamp: string;
}

export class QuizQualityReport {
  static formatMarkdown(report: QuizQualityReportData): string {
    return `# FactoryOS Quiz Quality Report

**Quiz Title**: ${report.quizTitle}  
**Timestamp**: ${report.timestamp}  
**Total Questions**: ${report.totalQuestions}  
**Guardian Decision**: **${report.decision}**  
**Overall Quality Score**: ${(report.overallScore * 100).toFixed(1)}%

---

## Metric Breakdown
- **Structure Score**: ${(report.structureScore * 100).toFixed(1)}%
- **Uniqueness Score**: ${(report.uniquenessScore * 100).toFixed(1)}%
- **Structural Clarity Score**: ${(report.ambiguityScore * 100).toFixed(1)}%
- **Semantic Option Score**: ${(report.semanticScore * 100).toFixed(1)}%
- **Factuality & NLI Grounding Score**: ${(report.factualityScore * 100).toFixed(1)}%

---

## Findings & Reasons
${report.summaryReasons.length === 0 ? "- All Guardian quality checks passed with zero defects." : report.summaryReasons.map((r) => `- ${r}`).join("\n")}
`;
  }
}
