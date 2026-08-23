# Skill: Worker Routing
id: worker-routing
version: 1.0.0
owner: Overseer / Compute Plane Team

## WHEN TO USE
Invoked by the runtime to select the appropriate render worker queue based on user role, worker health, and capacity.

## REQUIRED INPUTS
- `userRole`: Server-authoritative caller role ("ADMIN", "OWNER", "EDITOR", "VIEWER")
- `jobPriority`: Priority level (1 - 5)

## REQUIRED ACCESS
- Permissions: `workers:read`, `workers:route`
- Tools: `get_worker_pool_health`, `claim_worker_slot`

## EXECUTION SEQUENCE
1. Inspect server-authenticated role (never trust client role).
2. If role is ADMIN or OWNER, route to Azure GPU render pool.
3. If role is VIEWER or EDITOR, route to GitHub Actions Basic render pool.
4. Verify target worker health. If target is unhealthy, apply failover policy within permitted role bounds.
5. Return assigned worker pool and execution token.

## DECISION RULES
- BASIC users MUST NEVER be routed to Azure GPU pool.
- ADMIN users MUST NOT be degraded to Basic queue unless Azure is in full outage.

## SAFETY BOUNDARIES
- Strict server-authoritative role boundary.
