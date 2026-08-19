# Floor 03 — Asset Specification & Realization Planning

**Floor ID**: `floor03`  
**Floor Name**: Asset Specification & Realization Planning  
**Floor Version**: `1.0.0`  
**Location**: `floors/floor03_asset_realization/`  
**Status**: **FLOOR 03 DETERMINISTIC CORE IMPLEMENTATION COMPLETE & FROZEN**  
**Overseer Integration Status**: `CONTRACT_DEFINED` | `INTEGRATION_PENDING`  
**Report Persistence Classification**: `LOCAL_DEVELOPMENT_ARTIFACT_PERSISTENCE = IMPLEMENTED` | `CENTRALIZED_OVERSEER_PERSISTENCE = INTEGRATION_PENDING`  

---

## 1. Overview & Architectural Scope

Floor 03 is the asset specification and realization planning engine of FactoryOS. It transforms upstream narrative scripts (`Floor02HandoffPayload`) into machine-consumable visual and audio asset requirements (`Floor03HandoffPayload`) and asset manifests. Floor 03 specifies WHAT assets are required; actual FFmpeg video assembly and speech synthesis are owned downstream by `vps-rendering-engine` and cloud/local generation providers.

Key responsibilities:
1. **Upstream Handoff Ingestion**: Consumes `Floor02HandoffPayload` immutably without modifying Floor 02 or Floor 01.
2. **Authoritative Platform Resolution**: Resolves target platform via hierarchy ($\text{upstream Strategy platform} \succ \text{authorized caller override} \succ \text{configuration default}$) without silent defaults.
3. **Visual Asset Requirement Planning**: Generates machine-consumable prompt specifications (`VisualAssetRequirement`) from visual narrative intent. Rejects missing `visual_intent` with `Floor03ValidationError`.
4. **Audio Asset Requirement Planning**: Generates voiceover audio specifications (`AudioAssetRequirement`). Voice selection is nullable/configurable.
5. **Decoupled Asset Identity & Versioning**: Decouples scene identity from asset identity ($\text{scene\_id} \neq \text{asset\_id}$). Single-scene regeneration ($scene\_version$ $v1 \rightarrow v2$) assigns new `asset_id` references and $asset\_version = 2$ to target scene assets while preserving exact byte and semantic specification equality for unaffected scenes.
6. **Mandatory Provenance & Execution Mode**: Enforces non-empty provenance lists for all decisions and execution reports. `DETERMINISTIC_FALLBACK` execution mode is used ONLY when actual fallback occurred.

---

## 2. Core Contracts Architecture

### A. Downstream Handoff Contract (`Floor03HandoffPayload`)
Handed off downstream to asset execution layers and `vps-rendering-engine`. Contains `asset_plan_id`, `asset_plan_version`, `script_id`, `script_version`, `resolved_platform`, `visual_asset_requirements`, `audio_asset_requirements`, `manifest`, handoff status, and mandatory non-empty `provenance`.

### B. Overseer Execution Report Contract (`FloorExecutionReport`)
Generated for Overseer control plane consumption. Contains execution metrics (`execution_id`, `started_at`, `completed_at`, `duration_ms`), per-worker execution modes, decisions, component gates, and mandatory non-empty `provenance_audit`.

---

## 3. Authoritative Capability Matrix

```
╔════════════════════════════════════════════════════════════╗
║                 FACTORYOS — FLOOR 03                     ║
╠════════════════════════════════════════════════════════════╣
║ Deterministic asset specification    IMPLEMENTED          ║
║ Visual prompt planning               IMPLEMENTED          ║
║ Audio asset requirement planning     IMPLEMENTED          ║
║ Authoritative platform resolution    IMPLEMENTED          ║
║ Decoupled asset identity & versioning IMPLEMENTED          ║
║ Visual continuity metadata           IMPLEMENTED          ║
║ Asset manifest assembly              IMPLEMENTED          ║
║ Mandatory provenance traceability    IMPLEMENTED          ║
║ Floor 02 contract ingestion          IMPLEMENTED          ║
║ Local execution report generation    IMPLEMENTED          ║
║ API authentication                   IMPLEMENTED          ║
║ Rate limiting                        IMPLEMENTED          ║
║ Input sanitization                   IMPLEMENTED          ║
║ Workspace path boundary validation   IMPLEMENTED          ║
║ Zero-tool LLM boundary               IMPLEMENTED          ║
║ Multiprocess lock deduplication      IMPLEMENTED          ║
║                                                            ║
║ Prompt injection resilience          NOT_IMPLEMENTED     ║
║ Output security filtering            NOT_IMPLEMENTED     ║
║ Concurrent execution deduplication   NOT_IMPLEMENTED     ║
║ Production LLM execution             EXTERNAL_DEPENDENCY ║
║ Overseer transport                   INTEGRATION_PENDING ║
║ Generative AI video                  NOT_IMPLEMENTED     ║
║ Generative character consistency     NOT_IMPLEMENTED     ║
╚════════════════════════════════════════════════════════════╝
```

---

## 4. Authoritative Verification Results & Test Inventory (Task 1246)

Command: `python -m pytest floors/floor01_strategy/tests/ floors/floor02_scripting/tests/ floors/floor03_asset_realization/tests/`  
Authoritative Task Log: `used_artifact/test_runs/task-1246.log`

```
============================= 79 passed in 12.71s =============================
```

### Complete Floor 03 25-Test Inventory:

1. `test_floor02_handoff_ingestion_and_asset_planning`: Ingestion of Floor 02 payload and asset specification generation.
2. `test_execution_report_generation_and_artifact_persistence`: Overseer execution report generation and physical JSON artifact persistence.
3. `test_mandatory_non_empty_provenance`: Enforces mandatory non-empty provenance lists for payload and execution reports.
4. `test_strict_schema_extra_forbid`: Verifies `extra="forbid"` schema validation on domain models.
5. `test_idempotency_conflict_rejection`: Rejects duplicate `request_id` submitted with conflicting `script_id`.
6. `test_upstream_platform_resolution`: Priority 1 upstream strategy platform resolution.
7. `test_authorized_caller_override`: Priority 2 authorized caller platform override (`authorized_override=True`).
8. `test_unauthorized_caller_override_rejection`: Rejection of unauthorized caller platform override (`authorized_override=False`).
9. `test_image_prompt_worker_success`: Visual asset requirement planning.
10. `test_image_prompt_worker_missing_visual_intent_rejection`: Rejection of missing/whitespace `visual_intent` with `Floor03ValidationError`.
11. `test_audio_spec_worker`: Audio asset requirement planning.
12. `test_continuity_worker`: Attachment of character profile continuity descriptors.
13. `test_manifest_worker`: Assembly of overall `AssetManifest`.
14. `test_single_scene_asset_regeneration_invariants`: Targeted single-scene asset regeneration ($asset\_version$ $v1 \rightarrow v2$) with new `asset_id` references and preserved byte/semantic equality for unaffected scenes.
15. `test_scene_asset_regeneration_invalid_scene_id_rejection`: Rejection of invalid scene ID during regeneration.
16. `test_input_text_sanitization`: Input text sanitization against HTML script tags and injection keywords.
17. `test_workspace_path_boundary_validation`: Path traversal security validation (`Path.resolve().is_relative_to()`).
18. `test_api_key_verification`: Rejection of invalid or missing API key headers.
19. `test_token_bucket_rate_limiter`: In-process token bucket rate limiting.
20. `test_asset_memory_corruption_recovery`: Automatic backup (`.corrupted.<timestamp>`) and recovery of corrupted memory files.
21. `test_multiprocess_concurrent_duplicate_asset_persistence`: **CONCURRENT PERSISTENCE DEDUPLICATION** across 5 OS processes under sidecar `.lock` protection.
22. `test_health_check_endpoint`: GET `/v1/assets/health` status endpoint.
23. `test_plan_assets_endpoint_success`: POST `/v1/assets/plan` pipeline endpoint.
24. `test_execution_report_endpoint`: POST `/v1/assets/execution-report` endpoint.
25. `test_regenerate_scene_endpoint_success`: POST `/v1/assets/regenerate-scene` endpoint.
