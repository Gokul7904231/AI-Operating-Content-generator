# Floor 02 — Scripting & Narrative

**Floor ID**: `floor02`  
**Floor Name**: Scripting & Narrative  
**Floor Version**: `1.0.0`  
**Location**: `floors/floor02_scripting/`  
**Status**: **FLOOR 02 DETERMINISTIC CORE IMPLEMENTATION COMPLETE & FROZEN**  
**Overseer Integration Status**: `CONTRACT_DEFINED` | `INTEGRATION_PENDING`  
**Report Persistence Classification**: `LOCAL_DEVELOPMENT_ARTIFACT_PERSISTENCE = IMPLEMENTED` | `CENTRALIZED_OVERSEER_PERSISTENCE = INTEGRATION_PENDING`  

---

## 1. Overview & Architectural Scope

Floor 02 is the scripting and narrative planning engine of FactoryOS. It transforms strategic content directions produced by Floor 01 into detailed narrative script specifications ready for downstream asset generation in Floor 03.

Key responsibilities:
1. **Upstream Handoff Ingestion**: Consumes `Floor01HandoffPayload` without modifying Floor 01.
2. **Narrative Structure Architecture**: Transforms core objectives and takeaway structures into short-form formats (`educational_explainer`, `quiz_shorts`).
3. **Dialogue & Narration Writing**: Generates exact spoken voiceover text, on-screen caption overlays, and exact lexical word counts.
4. **Scene Narrative Planning**: Generates semantic visual intent descriptions and visual continuity tags (WHAT the scene communicates visually; HOW assets are generated belongs to Floor 03).
5. **Pacing & Duration Math**: Validates narration word count against target duration bounds ($\text{speech\_duration} = \frac{\text{word\_count}}{2.5}$, $\text{pause\_duration} = 0.0\text{s}$, $\text{total\_duration} = \text{speech\_duration}$).
6. **Single-Scene Regeneration & Versioning**: Enables targeted single-scene edits while preserving overall script identity, incrementing `script_version` and `scene_version` without altering unaffected scenes.

---

## 2. Core Contracts Architecture

### A. Downstream Handoff Contract (`Floor02HandoffPayload`)
Handed off downstream to Floor 03 (Visual & Audio Prompting / Asset Intelligence). Contains `script_id`, `script_version`, `title`, `logline`, `scenes` array with stable `scene_id` and `scene_version`, estimated durations, character profiles, educational beats, decision quality score, handoff status, and provenance audit log.

### B. Overseer Execution Report Contract (`FloorExecutionReport`)
Generated for Overseer control plane consumption. Contains execution metrics (`execution_id`, `started_at`, `completed_at`, `duration_ms`), execution mode details (configured vs executed provider and model), per-worker summaries, decisions, component gates, and provenance audit log.

---

## 3. Authoritative Capability Matrix

```
╔════════════════════════════════════════════════════════════╗
║                 FACTORYOS — FLOOR 02                       ║
╠════════════════════════════════════════════════════════════╣
║ Deterministic narrative engine       IMPLEMENTED           ║
║ Dialogue generation                  IMPLEMENTED           ║
║ Scene narrative planning             IMPLEMENTED           ║
║ Lexical word counting                IMPLEMENTED           ║
║ Speech pacing validation              IMPLEMENTED          ║
║ Scene regeneration                    IMPLEMENTED          ║
║ Versioned scene identity              IMPLEMENTED          ║
║ Provenance traceability               IMPLEMENTED          ║
║ Floor 01 contract ingestion           IMPLEMENTED          ║
║ Local execution report generation     IMPLEMENTED          ║
║ API authentication                    IMPLEMENTED          ║
║ Rate limiting                         IMPLEMENTED          ║
║ Input sanitization                    IMPLEMENTED          ║
║ Zero-tool LLM boundary                IMPLEMENTED          ║
║                                                            ║
║ Prompt injection resilience           NOT_IMPLEMENTED      ║
║ Output security filtering             NOT_IMPLEMENTED      ║
║ Concurrent execution deduplication    NOT_IMPLEMENTED      ║
║ Production LLM execution              EXTERNAL_DEPENDENCY  ║
║ Overseer transport                    INTEGRATION_PENDING  ║
║ Floor 03 integration                  NOT_IMPLEMENTED      ║
╚════════════════════════════════════════════════════════════╝
```

---

## 4. Authoritative Verification Results & Test Inventory (Task 1029)

Command: `python -m pytest floors/floor02_scripting/tests/ --durations=10`  
Authoritative Task Log: `used_artifact/test_runs/task-1029.log`

```
============================ slowest 10 durations =============================
2.37s call     floors/floor02_scripting/tests/unit/test_security_concurrency.py::test_multiprocess_concurrent_duplicate_script_persistence
0.03s call     floors/floor02_scripting/tests/api/test_script_api.py::test_health_check_endpoint
0.02s call     floors/floor02_scripting/tests/test_handoff.py::test_execution_report_artifact_persistence
0.02s call     floors/floor02_scripting/tests/unit/test_security_concurrency.py::test_script_memory_corruption_recovery
0.02s call     floors/floor02_scripting/tests/api/test_script_api.py::test_regenerate_scene_endpoint_success
0.02s call     floors/floor02_scripting/tests/api/test_script_api.py::test_regenerate_scene_endpoint_invalid_scene
0.02s call     floors/floor02_scripting/tests/api/test_script_api.py::test_plan_script_endpoint_success
0.01s call     floors/floor02_scripting/tests/api/test_script_api.py::test_execution_report_endpoint

============================= 23 passed in 3.41s ==============================
```

### Complete 23-Test Inventory:

1. `test_floor01_handoff_ingestion`: Ingestion of Floor 01 strategy payload.
2. `test_execution_report_generation`: Generation of Overseer execution report.
3. `test_execution_report_artifact_persistence`: Physical persistence of execution report JSON to `used_artifact/reports/`.
4. `test_provenance_correctness`: Hardened provenance entries for narrative decisions.
5. `test_idempotency_payload_mismatch_rejection`: Rejection of duplicate `request_id` with conflicting topic query.
6. `test_word_count_algorithm`: Lexical word counting algorithm across contractions (`don't`), code identifiers (`@decorator`), and punctuation.
7. `test_narrative_architect_worker`: High-level narrative outline generation.
8. `test_dialogue_scriptwriter_worker`: Dialogue narration writing and speech rate calculations.
9. `test_scene_narrative_planner_worker`: Semantic visual narrative intent and visual continuity.
10. `test_pacing_validator_exact_math`: Pacing math without manufactured pause duration ($\text{speech\_duration} = \text{total\_duration} = 5.6\text{s}$).
11. `test_pacing_impossible_duration_rejection`: Pacing duration quality gate rejection on impossible word counts.
12. `test_single_scene_regeneration_invariants`: Byte/semantic equivalence of unaffected scenes during single-scene regeneration.
13. `test_scene_regeneration_invalid_scene_id_rejection`: Rejection of non-existent scene ID during regeneration.
14. `test_input_text_sanitization`: Sanitization against HTML script tags and prompt injection keywords.
15. `test_api_key_verification`: Rejection of invalid or missing API key header.
16. `test_token_bucket_rate_limiter`: In-process token bucket rate limiting.
17. `test_script_memory_corruption_recovery`: Auto-recovery and backup of corrupted storage files.
18. `test_multiprocess_concurrent_duplicate_script_persistence`: **CONCURRENT PERSISTENCE DEDUPLICATION** across 5 OS processes under sidecar `.lock` protection.
19. `test_health_check_endpoint`: GET `/health` status check.
20. `test_plan_script_endpoint_success`: POST `/v1/script/plan` pipeline endpoint.
21. `test_execution_report_endpoint`: POST `/v1/script/execution-report` endpoint.
22. `test_regenerate_scene_endpoint_success`: POST `/v1/script/regenerate-scene` endpoint verification.
23. `test_regenerate_scene_endpoint_invalid_scene`: POST `/v1/script/regenerate-scene` error handling.

**31 Floor 01 tests remain 100% passing in 4.52s** (Log: `task-1010.log`).
