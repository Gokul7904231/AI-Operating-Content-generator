# FactoryOS v0.1 — Autonomous Production Problem Ledger

**Audit Date**: 2026-08-06  
**Maintainer**: Principal Architect & Release Engineer  

---

## Discovered Defect Ledger

| ID | Severity | Component | Symptom | Root Cause | Reproduction | Solution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PL-01** | **P1** | `ProductionStateMachine` | `InvalidStateTransitionError` when resuming outbox delivery | `DELIVERY_PENDING` was not recognized as a resume starting state in `ProductionRunner` | Run `runner.executeJob` on a job in `DELIVERY_PENDING` status | Added explicit `DELIVERY_PENDING` resume handler transitioning directly to `UPLOADING` | **RESOLVED** |
| **PL-02** | **P2** | `LocalNLIProvider` | False contradiction triggered when premise contained shared location token (e.g. "Paris") across questions | Context token match was checking `tokens.some()` (1 token) instead of 2+ tokens | Evaluating Q2 ("Which river flows through Paris?") against Q1 evidence ("Paris is capital") | Updated `_checkEntityMismatch` to require at least 2 matching context tokens (or 50%+) | **RESOLVED** |
| **PL-03** | **P2** | `ProductionRunner` | Vector retrieval across multi-question corpus caused cross-question context interference | Evidence corpus was seeded as 1 single document across all questions | Vector search for Q2 retrieved Q1 text | Updated `ProductionRunner` to seed individual per-question evidence documents (`doc_q1`, `doc_q2`, ...) | **RESOLVED** |
| **PL-04** | **P1** | `DriveDeliveryAdapter` | Google Drive credential absence crashed pipeline | Unconfigured credentials threw unhandled exception | Run pipeline without OAuth environment variables | Implemented graceful fallback to `LOCAL_OUTBOX` delivery mode when credentials are missing | **RESOLVED** |
