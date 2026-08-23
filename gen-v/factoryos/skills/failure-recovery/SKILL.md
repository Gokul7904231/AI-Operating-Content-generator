# Skill: Failure Recovery & Self-Healing
id: failure-recovery
version: 1.0.0
owner: Overseer / SRE Reliability Team

## WHEN TO USE
Invoked when any task in a mission experiences an error, worker timeout, or delivery failure.

## REQUIRED INPUTS
- `errorPayload`: Raw error object, stack, or status code
- `failedTaskId`: Task where the fault occurred
- `attemptCount`: Current retry count

## REQUIRED ACCESS
- Tools: `classify_failure`, `apply_deterministic_recovery`, `reconcile_quota_reservation`

## EXECUTION SEQUENCE
1. Classify failure into taxonomy: `TRANSIENT`, `AUTH`, `RESOURCE`, `WORKER`, `MODEL`, `ASSET`, `VALIDATION`, `DELIVERY`, `POLICY`, `UNKNOWN`.
2. Apply deterministic fast-path if applicable (e.g. HTTP 429 backoff, HTTP 500 retry, MP4 rebuild).
3. If ambiguous or unknown, route to RecoveryAgent for root-cause synthesis.
4. If permanent worker failure, reconcile quota reservation to prevent leaked user balance.
5. Resume mission from checkpointed failed step without re-executing completed tasks.

## DECISION RULES
- Never blind loop beyond `maxRetries` (default: 3).
- Always release quota reservation if render is permanently aborted.
