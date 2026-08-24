# FACTORYOS — FLOOR 04: MEDIA SYNTHESIS & PROVIDER EXECUTION

**Location**: `floors/floor04_media_synthesis/`  
**Adapter Location**: `factoryos/guardian/floors/floor04_guardian.py`  
**Status**: 🔒 **APPROVED & FROZEN (DETERMINISTIC CORE)**  
**Frozen Baseline Test Suite**: **175/175 PASSING TESTS (129 Core Baseline + 46 Floor 04 Tests)**  

---

## 1. Domain Responsibility

Floor 04 is the **Media Synthesis & Provider Execution Floor** in FactoryOS. It takes machine-consumable asset specifications produced by Floor 03 (`Floor03HandoffPayload`) and orchestrates visual frame synthesis, voiceover audio generation, background audio acquisition, physical media validation, local media storage, and rights metadata registration.

```text
FLOOR 03 (Asset Realization Specs)
               │
               ▼
┌─────────────────────────────┐
│        FLOOR 04 BRAIN       │
│ Proposes candidate actions  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      GUARDIAN KERNEL        │
│ Authorizes policy, budget,  │
│ transactions, idempotency   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      FLOOR 04 WORKERS       │
│ Image, TTS, Audio Workers   │
└──────────────┬──────────────┘
               │ UNTRUSTED OUTPUT
               ▼
┌─────────────────────────────┐
│   PHYSICAL MEDIA VALIDATOR  │
│ Magic bytes, MIME, Spec     │
│ dimensions/duration, Decode │
└──────────────┬──────────────┘
               │ VALID
               ▼
┌─────────────────────────────┐
│    LOCAL MEDIA REGISTRY     │
│ data/media_storage/ + Hash  │
└──────────────┬──────────────┘
               │
               ▼
   FLOOR 05 TIMELINE COMPOSITION
```

---

## 2. Immutable Architectural Invariants (7/7 Verified)

1. **Brain Cannot Authorize Itself**: `MediaBrain` produces candidate proposals (`BrainProposal`), but only `GuardianEngine` can authorize tool/worker execution.
2. **Brain Cannot Bypass Guardian**: Unregistered execution attempts trigger fatal `POLICY_WORKER_AUTHORIZED` policy denials.
3. **Worker Cannot Bypass Validator**: Corrupt or invalid artifacts are strictly rejected by `PhysicalMediaValidator`.
4. **Provider Metadata Cannot Override Physical Bytes**: Provider-declared MIME types mismatching raw file byte inspection are rejected (`Provider Trust Violation`).
5. **Provider Cannot Choose Arbitrary Paths**: Out-of-bounds output paths fail path security and symlink containment rules.
6. **Failed Transaction Cannot Commit**: Transactions with failed or corrupted worker execution roll back, never commit.
7. **Ambiguous Recovery Becomes ORPHANED**: Partial/inconsistent staging files transition to `ORPHANED` during restart reconciliation.

---

## 3. Capability Classification Matrix

| Capability / Module | Status | Verification Evidence |
| :--- | :--- | :--- |
| **Floor 03 Handoff Intake** | `IMPLEMENTED` | `test_floor04_handoff_contract_serialization` |
| **Deterministic Visual Frame Worker** | `IMPLEMENTED` | `test_run_image_worker` |
| **Deterministic TTS Narration Worker** | `IMPLEMENTED` | `test_run_tts_worker` |
| **Background Audio & Rights Metadata** | `IMPLEMENTED` | `test_run_background_audio_worker` |
| **Physical Media Output Validator** | `IMPLEMENTED` | 18 OWASP tests in `test_physical_validator_extended.py` |
| **Storage & Provenance Registry** | `IMPLEMENTED` | `test_registry_register_and_retrieve` & `test_registry_spec_linkage_verification` |
| **Crash Reconciliation Engine** | `IMPLEMENTED` | `test_reconciliation_commits_valid_files` & `test_reconciliation_cleans_orphaned_staging_files` |
| **Floor 04 Media Brain** | `IMPLEMENTED` | `test_brain_proposal_generation` |
| **Guardian Adapter & Policies** | `IMPLEMENTED` | `test_guardian_authorizes_registered_capability` |
| **Real Image Generation Providers** | `EXTERNAL_DEPENDENCY` | Real OpenAI DALL-E / Stable Diffusion / Midjourney APIs unverified |
| **Real TTS Voice Providers** | `EXTERNAL_DEPENDENCY` | Real EdgeTTS / ElevenLabs / OpenAI Voice APIs unverified |
| **Real Audio Acquisition Providers** | `EXTERNAL_DEPENDENCY` | Real third-party licensed library integration unverified |
| **Prompt Injection Resilience** | `NOT_VERIFIED` | Threat model & adversarial attack resilience unverified |
| **Production Autonomous Readiness** | `NOT_VERIFIED` | Production live quality & model decision quality unverified |

---

## 4. Test Suite Execution Summary

```bash
python -m pytest floors/floor01_strategy/tests/ floors/floor02_scripting/tests/ floors/floor03_asset_realization/tests/ floors/floor04_media_synthesis/tests/ tests/guardian/
```

- **Floor 01 Strategy Suite**: 31/31 PASSING 🔒
- **Floor 02 Scripting Suite**: 23/23 PASSING 🔒
- **Floor 03 Asset Realization Suite**: 25/25 PASSING 🔒
- **Guardian Control Plane Kernel Suite**: 50/50 PASSING 🔒
- **Floor 04 Media Synthesis Suite**: 46/46 PASSING 🔒
- **Total Baseline Suite**: **175/175 PASSING TESTS IN 15.23s** 🔒
