# FactoryOS — Autonomous Floor Guardian System

**System**: Autonomous Floor Guardian Control Plane & Transactional Execution Engine  
**Package Location**: `factoryos/guardian/`  
**Status**: **HARDENED CONTROL PLANE COMPLETE & FROZEN CORES PROTECTED**  
**Total Workspace Test Suite**: **125 PASSING TESTS** (31 Floor 01 + 23 Floor 02 + 25 Floor 03 + 46 Guardian Kernel & Brain Scenarios)  

---

## 1. Authoritative Capability Matrix

```text
╔════════════════════════════════════════════════════════════╗
║                 FACTORYOS — GUARDIAN                     ║
╠════════════════════════════════════════════════════════════╣
║ Guardian orchestration framework     IMPLEMENTED          ║
║ Deterministic autonomous loop        IMPLEMENTED          ║
║ Floor-specific Guardian adapters     IMPLEMENTED          ║
║ Allowlist capability registry        IMPLEMENTED          ║
║ Action Gate enforcement              IMPLEMENTED          ║
║ Transactional action safety gate     IMPLEMENTED          ║
║ Domain-aware output verification     IMPLEMENTED          ║
║ Prompt injection filtering           IMPLEMENTED          ║
║ Capability containment               IMPLEMENTED          ║
║ Decision authorization               IMPLEMENTED          ║
║ Circuit breaker & recovery matrix    IMPLEMENTED          ║
║ Structured decision records          IMPLEMENTED          ║
║ 79-test frozen floor regression      VERIFIED (79/79)     ║
║ 46-test Guardian control plane suite VERIFIED (46/46)     ║
║                                                            ║
║ Defense-in-depth injection controls  PARTIALLY_IMPLEMENTED║
║ Autonomous decision-making           PARTIALLY_IMPLEMENTED║
║ Prompt injection resilience          NOT_VERIFIED         ║
║ Production autonomous intelligence   NOT_VERIFIED         ║
║ Real LLM autonomous reasoning        EXTERNAL_DEPENDENCY  ║
╚════════════════════════════════════════════════════════════╝
```

---

## 2. Core Architectural System Design

```text
             ┌─────────────────────┐
             │  Guardian Kernel    │
             └──────────┬──────────┘
                        ↓
                 State Machine
                        ↓
                 Reasoning Layer
                        ↓
                 Policy Engine
                        ↓
              Capability Registry
                        ↓
             Transactional Action Gate
                        ↓
                    Worker
                        ↓
                Domain Validator
                        ↓
              Recovery / Escalate
                        ↓
                 Provenance
```

---

## 3. Key Control-Plane Components

1. **`CapabilityRegistry` Authority**: Allowlisted floor worker capabilities are the sole authority for action execution.
2. **`TransactionalActionGate`**: Manages action transactional states (`PROPOSED` $\rightarrow$ `AUTHORIZED` $\rightarrow$ `PREPARED` $\rightarrow$ `EXECUTING` $\rightarrow$ `COMMITTED` / `ROLLED_BACK`). Assigns unique `attempt_id` and `idempotency_key`.
3. **Structured `GuardianDecision` Records**: Persists audit evidence including `observation`, `candidate_actions`, `rejected_actions`, `selected_action`, `selection_reason`, and `policy_checks`.
4. **`DomainValidator`**: Verifies domain invariants before transitioning to `COMPLETED`:
   - Floor 01: `selected_topic`, `strategy.platform`, `curriculum.learning_objectives`.
   - Floor 02: `scene count > 0`, `scene_id` presence, `word_count > 0`.
   - Floor 03: $\text{asset\_id} \neq \text{scene\_id}$, `manifest` asset count alignment.
5. **`RecoveryEngine`**: Classifies failures into recovery strategies (`RETRY_SAME_ACTION`, `RETRY_WITH_BACKOFF`, `CHOOSE_ALTERNATE_CAPABILITY`, `REPLAN`, `ESCALATE`).

---

## 4. Test Verification Evidence

Command: `python -m pytest floors/floor01_strategy/tests/ floors/floor02_scripting/tests/ floors/floor03_asset_realization/tests/ tests/guardian/`

```text
============================ 125 passed in 10.54s =============================
```
