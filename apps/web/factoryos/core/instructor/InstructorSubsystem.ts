/**
 * FactoryOS v1 — Bounded Instructor Subsystem
 * Non-agentic deterministic contract enforcer, schema validator, and JSON output repairer.
 */

import type {
  IInstructorSubsystem,
  SchemaValidationRequest,
  SchemaValidationResult,
} from "../contracts/InstructorContracts";

export class InstructorSubsystem implements IInstructorSubsystem {
  async validateAndRepair<T = Record<string, unknown>>(
    request: SchemaValidationRequest
  ): Promise<SchemaValidationResult<T>> {
    let rawStr = typeof request.rawOutput === "string" ? request.rawOutput : JSON.stringify(request.rawOutput);
    let parsed: any = null;
    let repaired = false;
    const errors: string[] = [];

    // Step 1: Parse Attempt
    try {
      parsed = typeof request.rawOutput === "object" && request.rawOutput !== null ? request.rawOutput : JSON.parse(rawStr);
    } catch {
      if (request.autoRepair !== false) {
        const cleaned = this.attemptJsonRepair(rawStr);
        try {
          parsed = JSON.parse(cleaned);
          repaired = true;
          rawStr = cleaned;
        } catch (e: any) {
          errors.push(`JSON parse error after repair attempt: ${e.message}`);
        }
      } else {
        errors.push("Invalid JSON syntax and autoRepair is disabled");
      }
    }

    // Step 2: Validate Required Fields
    if (parsed && typeof parsed === "object") {
      for (const field of request.expectedFields) {
        if (!(field in parsed) || parsed[field] === undefined || parsed[field] === null) {
          errors.push(`Missing required field: '${field}' for schema '${request.schemaName}'`);
        }
      }
    } else if (errors.length === 0) {
      errors.push(`Parsed output is not an object (schema: ${request.schemaName})`);
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      validatedData: isValid ? (parsed as T) : undefined,
      repaired,
      errors,
      rawOutputString: rawStr,
    };
  }

  private attemptJsonRepair(raw: string): string {
    let s = raw.trim();

    // Strip markdown code fences (```json ... ```)
    if (s.startsWith("```")) {
      s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }

    // Locate first '{' or '[' and last '}' or ']'
    const firstBrace = s.indexOf("{");
    const firstBracket = s.indexOf("[");
    let startIdx = -1;

    if (firstBrace !== -1 && firstBracket !== -1) {
      startIdx = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIdx = firstBrace;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
    }

    if (startIdx !== -1) {
      s = s.substring(startIdx);
    }

    // Remove trailing trailing commas before closing braces/brackets
    s = s.replace(/,\s*([}\]])/g, "$1");

    return s;
  }
}
