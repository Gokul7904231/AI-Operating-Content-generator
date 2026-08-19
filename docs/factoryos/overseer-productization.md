# FactoryOS Frontier v2 — Unified Overseer Command Center & Productization Specification

## 1. Executive Summary
FactoryOS Frontier v2 has elevated the Overseer from an isolated backend supervisor and detached floating chat panel into the **native intelligence and presence core of the primary `/dashboard` Command Center**. 

The operator now interacts directly with a single unified, living interface combining:
- **Procedural Living Face**: 17 expression presets with darker FactoryOS industrial palette (`#0A84FF`, `#19BFFF`, `#07111F`, `#0B1220`, `#101827`, emerald, amber, crimson), micro-saccades, blinks, and dynamic mouth aperture responding to speech amplitude.
- **Operational Status & Live Telemetry HUD**: Real-time health counters, floor status, active cases, worker states, and decision reasoning.
- **Integrated Operational Modes**: Direct mode switcher (`CHAT`, `OPERATE`, `RESEARCH`, `CREATE`, `MONITOR`, `AUTOPILOT`) built into the conversational interface.
- **Intent-Aware Routing Engine**:
  - Identity inquiries ("Who are you?") resolved with grounded persona context.
  - Repetition feedback recognized and adapted.
  - "Make me a quiz short" parsed into structured quiz objects and dispatched to the 9-stage factory pipeline via `MissionManager`.
  - External research queries routed through `AgentReachAdapter`.
  - Engineering/code diagnostics routed through `GStackTrigger`.
  - Proactive recommendations synthesized from `PredictiveFactoryEngine` and telemetry.
- **Canonical Navigation**: Removed duplicate floating chat drawers from `TopNav.tsx`; header triggers smoothly focus the Command Center.
- **Theme Persistence**: Working light, dark, and system theme switching persisted via `useThemeStore` and DOM synchronizer.

---

## 2. Architecture & Component Structure

```
                      +------------------------------------------+
                      |         FACTORYOS COMMAND CENTER         |
                      |            (/dashboard route)            |
                      +------------------------------------------+
                                           |
             +-----------------------------+-----------------------------+
             |                                                           |
+--------------------------+                               +--------------------------+
|  OVERSEER LIVING PRESENCE |                               | PRODUCTION & TELEMETRY   |
|--------------------------|                               |--------------------------|
| • OverseerFace (Canvas)  |                               | • 9 Subsystem Badges     |
| • Ambient Aura & Halo    |                               | • Throughput Stats       |
| • Status Sentence        |                               | • 9-Stage Pipeline       |
| • Metrics HUD Bar        |                               | • Live Activity Feed     |
| • Mode Selector Bar      |                               | • AIDecisionInspector    |
| • Quick Actions & Chips  |                               | • Attention Alerts       |
| • Proactive Insights     |                               +--------------------------+
| • Conversational Input   |
| • Progressive Disclosure |
+--------------------------+
             |
             +-----------------------------> API ROUTING LAYER:
                                             • /api/overseer/presence/interact
                                             • /api/overseer/presence/state
                                             • /api/overseer/presence/events (SSE)
                                                           |
                                             +-------------+-------------+
                                             |                           |
                                    [MissionManager]            [Autonomous Swarms]
                                    • 9-stage pipeline          • Floor Guardians
                                    • Quiz short generation     • Slayers & Healers
                                    • DAG dispatch              • Independent Validator
```

---

## 3. Verification & Acceptance Metrics
- **TypeScript Strict Compilation**: `npm run factoryos:typecheck` $\to$ **0 errors**.
- **Full Test Suite Execution**: `npx vitest run factoryos/tests` $\to$ **129 / 129 Test Files Passed (558 / 558 Tests Passed, 0 Failed, 0 Skipped)**.
- **Dedicated Acceptance Suite**: `unified-overseer-product-e2e.test.ts` $\to$ **7 / 7 Tests Passed**.
