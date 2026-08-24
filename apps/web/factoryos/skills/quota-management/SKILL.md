# Skill: Quota Management
id: quota-management
version: 1.0.0
owner: Overseer / FinOps Team

## WHEN TO USE
Invoked prior to dispatching any video generation to ensure atomic reservation, prevent race conditions, and track usage against limits.

## REQUIRED INPUTS
- `userId`: Tenant user ID
- `userRole`: Server-authoritative user role
- `action`: "RESERVE" | "FINALIZE" | "RELEASE"
- `slotId`: Unique reservation identifier

## REQUIRED ACCESS
- Tools: `reserve_quota_slot`, `finalize_quota_slot`, `release_quota_slot`

## EXECUTION SEQUENCE
1. Fetch user tier and active quota limit.
2. If role is ADMIN/OWNER, grant unlimited generation access.
3. If Basic user, perform atomic conditional transaction (completed + reserved < limit).
4. If limit reached (e.g. 5/5), deny creation with clear user-friendly explanation.
5. On render failure, release reserved slot immediately to prevent quota leakage.

## DECISION RULES
- Concurrency race conditions must be handled atomically using database transactions.
- Never increment `completed` count before validated artifact is produced.
