# EA-001 — Vision & Mission
## Package D — Risks, Assumptions, Long-Term Vision & Roadmap

> **Review Status:** Draft for Architecture Review Board (ARB) Review
> **Package:** D of E
> **Prerequisites:** [Package A](./Package-A-Executive.md), [Package B](./Package-B-Context-Drivers.md), [Package C](./Package-C-Objectives-KPIs.md)

---

## Table of Contents (Package D)

26. Risks
27. Assumptions
28. Guiding Philosophy
29. Long-Term Vision
30. Evolution Roadmap
31. Expected Outcomes
32. Open Questions
33. References
34. Cross-References

---

## 26. Risks

Risks are uncertainties that, if realized, would compromise the vision, objectives, or feasibility of FactoryOS. Each risk is assessed for likelihood and impact, assigned an owner, and given a mitigation. Risks are reviewed at every ARB cadence.

### 26.1 Risk Catalogue

| ID | Risk | Category | Likelihood | Impact | Severity | Owner | Mitigation |
|---|---|---|---|---|---|---|---|
| R-1 | **Category drift to workflow engine** | Strategic | High | High | 25 | Chief Architect | Non-scope N-3 (Package A §5.1); ARB rejects proposals that collapse FactoryOS into a workflow engine; every ADR must cite which operating concern it advances. |
| R-2 | **Category drift to agent framework** | Strategic | High | High | 25 | Chief Architect | Non-scope N-4; Workers are stateless executors, not agents; agent patterns are hosted, not prescribed. |
| R-3 | **Provider abstraction overhead unacceptable** | Technical | Medium | Medium | 9 | AI Infra Architect | Capability-based abstraction (not call-by-call); caching; KPI-P2 budget (≤50 ms P95 v1). If unmet, fall back to direct calls for hot paths with audit. |
| R-4 | **Durable execution substrate too complex to operate** | Technical | Medium | High | 15 | Distributed Systems Architect | Evaluate managed Temporal-class options before self-hosting; ADR (RO-1) must include operational cost. |
| R-5 | **Self-healing causes harm** | Governance | Medium | High | 15 | SRE Architect | RO-4 produces a safe-to-heal policy; default-deny for healing; human approval for novel failure classes. |
| R-6 | **Cost overruns despite guards** | Financial | Medium | High | 15 | Platform Eng Lead | CON-10; budget guards halt at 110%; KPI-G3 = 0/quarter; alerting at 50%/80%/100%. |
| R-7 | **Audit trail insufficient for regulators** | Compliance | Medium | High | 15 | Enterprise Architect | Map to ISO/IEC 42001 control objectives early (BO-7); external review before enterprise sales. |
| R-8 | **Generality thesis fails (second factory requires substrate change)** | Strategic | Medium | High | 15 | Chief Architect | SC-1 is a release gate; if unmet, document the substrate change and revise EA-001. |
| R-9 | **Local/cloud parity unachievable** | Technical | Medium | Medium | 9 | AI Infra Architect | Offline is "subject to local model capability" (CON-11); degraded mode is acceptable; full parity is v2. |
| R-10 | **Observability cost exceeds budget** | Technical | Medium | Medium | 9 | SRE Architect | Tiered observability (T-4); sample non-failure traces; full fidelity for failures only. |
| R-11 | **Documentation drift resumes** | Process | High | Medium | 12 | Technical Writer | Architecture as Code (EO-6); digital twin; KPI-O3 (≤7 days v1, ≤1 day v2). |
| R-12 | **Talent gap (operating-system-grade AI engineering is rare)** | Organizational | High | High | 25 | VP Engineering | Pair senior architects with AI engineers; AKB as onboarding; external advisory for RO items. |
| R-13 | **Scope creep (interactive inference, training, BI)** | Strategic | High | High | 25 | Chief Architect | Non-scope §5.2; ARB rejects out-of-scope proposals; scope changes require EA-001 revision. |
| R-14 | **Vendor lock-in via MCP extensions** | Technical | Low | Medium | 4 | AI Infra Architect | MCP is the boundary; proprietary extensions are non-normative and must be documented as such. |
| R-15 | **Multi-tenant isolation breach** | Security | Low | High | 10 | Security Architect | RO-7 produces isolation ADR before multi-tenant GA; defense-in-depth; pen-test before GA. |
| R-16 | **Roadmap slippage compounds** | Program | Medium | Medium | 9 | TPM | Milestone-gated releases (§30); explicit deferral with ARB approval; no silent slips. |
| R-17 | **Reference implementation (ShortsFactory) overfits the substrate** | Strategic | Medium | High | 15 | Chief Architect | SC-1 (second factory) is the counter-test; ShortsFactory must not leak into substrate seams. |
| R-18 | **Knowledge graph / digital twin scope ambiguity** | Technical | High | Medium | 12 | Chief Architect | RO-2, RO-3 produce ADRs before implementation; twin scope is bounded by ADR. |
| R-19 | **Policy language (DSL vs policy-as-code) chosen wrong** | Technical | Medium | Medium | 9 | Enterprise Architect | RO-6; prefer policy-as-code (Rego/CEL) unless proven insufficient; DSL is last resort. |
| R-20 | **Regulatory landscape shifts under us** | External | Medium | High | 15 | Legal/Compliance | Annual EA-001 review; assumptions A-CTX-4 revisited; compliance is a moving target by design. |

### 26.2 Risk Heat Map

```
                 Impact
          Low      Medium    High
Likelihood
  High     R-14     R-11      R-1, R-2, R-12, R-13
  Medium   —        R-3,R-9,  R-4, R-5, R-6, R-7,
                    R-10,R-16 R-8, R-17, R-20
  Low      —        —         R-15
                    R-18(High likelihood, Medium impact)
                    R-19(Medium likelihood, Medium impact)
```

### 26.3 Top Risks (Severity ≥ 15)

The following risks are the most consequential and receive the most active management:

1. **R-1 / R-2 — Category drift** (severity 25 each). The single most likely way FactoryOS fails is by becoming the thing it is defined *not* to be. Non-scope is the primary mitigation.
2. **R-12 — Talent gap** (severity 25). Operating-system-grade AI engineering is rare. Mitigation is organizational, not architectural.
3. **R-13 — Scope creep** (severity 25). The non-scope list exists because these scopes will be requested. ARB discipline is the mitigation.
4. **R-4, R-5, R-6, R-7, R-8, R-17, R-20** (severity 15 each). These are the technical and external risks that bound feasibility.

### 26.4 Risk Review Cadence

| Risk Class | Cadence | Action |
|---|---|---|
| Severity ≥ 20 | Monthly | Status report to ARB; mitigation progress tracked |
| Severity 10–19 | Quarterly | Status report to ARB |
| Severity < 10 | Annually | Review at EA-001 annual review |

### 26.5 Risk Triggers and Contingencies

| Risk | Trigger | Contingency |
|---|---|---|
| R-1 / R-2 | An ADR proposes FactoryOS as a workflow/agent framework. | ARB rejects; require ADR to cite operating concern. |
| R-3 | KPI-P2 exceeds 50 ms P95 for two consecutive quarters. | Optimize hot path; allow direct calls with audit; revisit abstraction. |
| R-8 | SC-1 fails (second factory requires substrate change). | Document change; revise EA-001; reassess generality thesis. |
| R-12 | Two consecutive milestones miss due to talent gap. | External advisory; hiring plan; descope. |
| R-16 | Two consecutive milestones slip by > 25%. | Re-baseline roadmap; ARB review; scope triage. |

---

## 27. Assumptions

Assumptions are propositions taken as true for the purpose of planning, despite uncertainty. Each assumption is labelled, has an owner, a validation method, and a consequence if invalid. Assumptions are distinct from constraints (Package C §24): constraints are fixed; assumptions are testable.

### 27.1 Assumption Catalogue

| ID | Assumption | Owner | Validation | Consequence if Invalid |
|---|---|---|---|---|
| A-1 | The operating-system primitives required to run ShortsFactory are sufficiently general to run other production factories without redesign. | Chief Architect | SC-1 (second factory onboarding) | Generality thesis fails; FactoryOS is a single-factory platform; revise EA-001. |
| A-2 | Frontier model capability will continue to commoditize across vendors. | AI Infra Architect | Annual market review (A-CTX-1) | Provider independence less valuable; but still required for vendor leverage. |
| A-3 | Local and edge model deployment will grow in enterprise share. | AI Infra Architect | Annual market review (A-CTX-2) | Offline capability less critical; CON-11 may be descoped. |
| A-4 | Multi-modal production workloads will outnumber text-only within 3 years. | Chief Architect | Annual market review (A-CTX-3) | Multi-modal coordination (TD-3) less load-bearing; but still required. |
| A-5 | Regulatory auditability requirements will tighten globally. | Legal/Compliance | Annual regulatory review (A-CTX-4) | Audit/governance less critical; but still required for enterprise. |
| A-6 | The cost of uncontrolled autonomous AI loops will exceed the cost of governing them. | Finance | Annual cost review (A-CTX-5) | Governance ROI thesis weakens; but governance still required for enterprise. |
| A-7 | Each research objective (RO-1..RO-8) is resolvable within v1–v2. | Chief Architect | RO ADRs | Corresponding strategic objective descoped or deferred. |
| A-8 | A Temporal-class durable execution engine is a suitable substrate. | Distributed Systems Architect | RO-1 ADR | Custom durable execution required; higher risk (R-4). |
| A-9 | Policy-as-code (Rego/CEL) is sufficient for governance; no DSL required. | Enterprise Architect | RO-6 ADR | DSL required; higher complexity (R-19). |
| A-10 | MCP will remain a stable, open standard. | AI Infra Architect | Annual standards review | Vendor-neutral tool boundary weakens; R-14. |
| A-11 | Workers can be made effectively stateless for the target workloads. | Platform Eng Lead | EO-7 scale test | Horizontal scale thesis fails; revisit TD-6. |
| A-12 | End-to-end traces are affordable at production volume. | SRE Architect | KPI-P3 + cost analysis | Tiered observability required; T-4 resolution. |
| A-13 | The first implementation (ShortsFactory) is representative enough to validate the substrate. | Chief Architect | SC-R1..SC-R5 | Substrate is under-validated; second factory is the real test (SC-1). |
| A-14 | Enterprise design partners will engage for validation. | VP Engineering | BO-3 (3 design partners) | Enterprise thesis unvalidated; BO-3 slips. |
| A-15 | The ARB will function as an effective governance body. | Chief Architect | ARB charter + review log | Governance is nominal; architecture drifts. |

### 27.2 Assumption Validation Schedule

| Assumption | First Validation | Recurrence |
|---|---|---|
| A-1 | SC-1 (v1 gate) | Per onboarding |
| A-2..A-6 | Annual market/regulatory review | Annual |
| A-7 | Per RO ADR | Per ADR |
| A-8 | RO-1 ADR | — |
| A-9 | RO-6 ADR | — |
| A-10 | Annual standards review | Annual |
| A-11 | EO-7 scale test (v2) | — |
| A-12 | KPI-P3 + cost (v1) | Quarterly |
| A-13 | SC-R1..SC-R5 (v1) | — |
| A-14 | BO-3 (12 mo) | — |
| A-15 | ARB review log | Quarterly |

### 27.3 Assumption vs. Constraint

| Item | Type | Negotiable? | Example |
|---|---|---|---|
| Vendor neutrality | Constraint (CON-1) | No (requires EA-001 revision) | "No single provider may be load-bearing." |
| ShortsFactory generality | Assumption (A-1) | Yes (testable) | "ShortsFactory primitives generalize." |

This distinction is load-bearing: constraints are the rules of the game; assumptions are the bets. EA-001 is explicit about which is which.

---

## 28. Guiding Philosophy

The guiding philosophy is the set of first principles from which all architectural decisions derive. These principles are not negotiable; they are the constitution. Downstream ADRs must be consistent with them or explicitly request an exception.

### 28.1 First Principles

| # | Principle | Statement | Derives |
|---|---|---|---|
| P-1 | **Operating system, not framework.** | FactoryOS provides an environment, not a library. Factories run *inside* it, not by importing it. | Vision V-1 |
| P-2 | **Governed autonomy.** | Autonomy is granted by policy, not assumed. Default-deny. Humans retain authority. | AD-3, AD-11, CON-4, CON-5 |
| P-3 | **Substrate over feature.** | Durability, governance, observability, self-healing, and documentation are substrate properties, not per-factory features. | AD-2..AD-7 |
| P-4 | **Provider independence is non-negotiable.** | No provider is load-bearing. Capability abstraction, not vendor SDKs, is the interface. | AD-1, CON-1 |
| P-5 | **Compositional, not competitive.** | FactoryOS hosts and governs existing mechanisms; it does not reinvent them. | §12.5 |
| P-6 | **Stateless execution, durable state.** | Workers are stateless; state is externalized to the durable substrate. | AD-9, TD-6, CON-6, CON-7 |
| P-7 | **Event-driven by default.** | Components communicate via the event bus; synchronous coupling is the exception. | AD-7, TD-7 |
| P-8 | **Observable by default.** | If it is not observed, it did not happen. Every run has a trace. | AD-5, CON-8 |
| P-9 | **Self-describing.** | The system documents its own state, decisions, and evolution. Architecture is code. | AD-7, SO-7 |
| P-10 | **Evolvable by contract.** | Interfaces are versioned; evolution is non-breaking. | AD-12, TD-10, CON-13 |
| P-11 | **Honest about trade-offs.** | Every recommendation states its trade-offs. Every assumption is labelled. | Document quality reqs |
| P-12 | **ARB-governed.** | Architecture is governed by review, not by individual authority. | CON-14 |

### 28.2 Philosophy in Practice

Each principle has a concrete test for whether a proposal honors it:

| Principle | Test |
|---|---|
| P-1 | Does the factory import FactoryOS, or run inside it? |
| P-2 | Is the proposed autonomy granted by an explicit policy, or assumed? |
| P-3 | Is the concern implemented in the substrate or per-factory? |
| P-4 | Does the proposal assume a specific provider is available? |
| P-5 | Does the proposal reinvent an existing mechanism, or host it? |
| P-6 | Does the worker hold state, or externalize it? |
| P-7 | Is the communication via the event bus, or a direct call? |
| P-8 | Does the run produce a trace? |
| P-9 | Is the change captured as code, or as folklore? |
| P-10 | Is the contract versioned? |
| P-11 | Are trade-offs and assumptions stated? |
| P-12 | Has the ARB reviewed it? |

### 28.3 Anti-Principles

Anti-principles are patterns the architecture explicitly rejects:

| # | Anti-Principle | Rejected Because |
|---|---|---|
| AP-1 | "It works for our first factory, so it's general." | Violates A-1; generality is tested by the second factory. |
| AP-2 | "We'll add governance later." | Violates P-2, P-3; governance is a substrate property, not a phase. |
| AP-3 | "This provider is good enough to be a default." | Violates P-4, CON-1. |
| AP-4 | "Workers can hold a little state." | Violates P-6, CON-6; stateful workers break horizontal scale. |
| AP-5 | "We'll document it after it works." | Violates P-9; documentation is a property, not a phase. |
| AP-6 | "We'll skip the ADR; it's obvious." | Violates P-12; obvious decisions are the most dangerous to skip. |

---

## 29. Long-Term Vision

### 29.1 The 10-Year Horizon

The vision (Package A §6) is a 10-year horizon statement. This section elaborates the long-term end state and the trajectory toward it.

**End state (Year 10):** FactoryOS is the standard operating environment for autonomous AI production in the enterprise. Multiple factories — across content, code, data, and research — run under a single governance, observability, and evolution model. Provider choice is a procurement decision, not an architectural one. New factories are onboarded in weeks, not quarters. The system is self-describing: its architecture is queryable, its decisions are auditable, and its evolution is traceable. Human authority is preserved; autonomy is granted where safe and withheld where risky.

### 29.2 Long-Term Capability Trajectory

| Horizon | Capability | Indicator |
|---|---|---|
| Year 1–2 | Operating substrate for one factory (ShortsFactory); governance, durability, observability, cost control. | SC-R1..R5, SC-1..5, SC-9 |
| Year 3–4 | Second factory onboarded; self-healing; Architecture as Code; enterprise deployment. | SC-6, SC-7, SC-8, SC-10 |
| Year 5–6 | Multiple factories; multi-tenant; regulatory-grade audit; vendor-neutral procurement. | BO-1, BO-2, BO-7 |
| Year 7–8 | Factory marketplace; cross-factory learning; digital twin as primary operational interface. | KPI-O1 ≤ 20% |
| Year 9–10 | Autonomous factory evolution; self-describing at the portfolio level; FactoryOS as a category standard. | Category adoption metric |

### 29.3 Long-Term Problem Solved

The long-term problem FactoryOS solves (restated from Package A §2) is the **operationalization of autonomous AI at enterprise scale**. Concretely, by Year 10:

- The cost of operating N factories is O(N), not O(N²).
- Provider swap is a procurement event, not an engineering project.
- Audit is a query, not an archaeological dig.
- Evolution is a versioned contract change, not a rewrite.
- Autonomy is a policy grant, not a risk.

### 29.4 Long-Term Risks to the Vision

| Risk | Horizon | Mitigation |
|---|---|---|
| The category never materializes (the market stays execution-centric). | Year 3+ | FactoryOS remains valuable as a single-factory operating environment; the category thesis is a bonus, not a dependency. |
| A major vendor builds a competing operating substrate. | Year 5+ | Vendor neutrality (CON-1) and compositional stance (P-5) keep FactoryOS relevant even if vendors offer substrates; FactoryOS is vendor-neutral by design. |
| The "OS" metaphor fails to resonate. | Year 1+ | The metaphor is a communication device, not a dependency; the substance (substrate concerns) stands regardless of metaphor. |

---

## 30. Evolution Roadmap

The roadmap is stated at **milestone granularity**, not release granularity. Release sequencing is a program concern (TPM-owned); this roadmap states the architectural milestones that gate releases.

### 30.1 Milestone Catalogue

| Milestone | Horizon | Gates | Architectural Significance |
|---|---|---|---|
| **M0 — Foundation** | 0–3 mo | EA-001 approved; EA-002 (principles) drafted; ARB chartered. | The constitution exists. |
| **M1 — Substrate Skeleton** | 3–6 mo | EO-1 (capability abstraction); EO-3 (governance primitives); event bus; Overseer/Guardians/Floors seams defined. | The seams exist before the components. |
| **M2 — Durable Execution** | 6–9 mo | EO-2 (durable substrate); RO-1 ADR; EO-4 (observability). | The substrate can survive restarts and be observed. |
| **M3 — Reference Factory (v1)** | 9–18 mo | SC-R1, SC-R2, SC-R3; SC-1, SC-2, SC-3, SC-4, SC-5, SC-9. | ShortsFactory validates the thesis in production. |
| **M4 — Self-Healing & AaC** | 12–24 mo | EO-5 (self-healing); EO-6 (AaC); RO-2, RO-3, RO-4 ADRs. | The system heals and describes itself. |
| **M5 — Scale & Enterprise (v2)** | 18–30 mo | SC-R4, SC-R5; SC-6, SC-7, SC-8, SC-10; EO-7, EO-8, EO-9. | Enterprise-ready, scaled, offline-capable. |
| **M6 — Second Factory** | 24–36 mo | SC-1 (second factory); BO-1, BO-8. | The generality thesis is validated. |
| **M7 — Multi-Factory Operations** | 36–48 mo | BO-2 (O(N) ops); KPI-O1 ≤ 20%. | The scale thesis is validated. |
| **M8 — Category Standard** | 48–60 mo | Category adoption; marketplace. | The category materializes. |

### 30.2 Roadmap Dependencies

```
M0 ─> M1 ─> M2 ─> M3 (v1)
                │
                └─> M4 ─> M5 (v2)
                              │
                              └─> M6 ─> M7 ─> M8
```

- M3 (v1) is the first release gate.
- M5 (v2) is the second release gate.
- M6 (second factory) is the generality gate; it may run in parallel with M5 but cannot complete before M5.
- M7 and M8 are post-v2 and are indicative, not committed.

### 30.3 Roadmap Risks

| Risk to Roadmap | Mitigation |
|---|---|
| M3 slips because substrate is incomplete. | M1/M2 gates are strict; no M3 without M2. |
| M6 slips because second factory is hard. | M6 is the test, not the deadline; if it slips, the thesis is reassessed (A-1). |
| M8 never arrives (category doesn't materialize). | M8 is aspirational; M1–M7 are valuable independently. |

### 30.4 Deferral and Descoping

Items not achieved at a milestone gate are **explicitly deferred** with ARB approval and a remediation plan. Silent slippage is prohibited (R-16). If a milestone cannot be met, the ARB either:
1. Approves a revised timeline with a documented cause, or
2. Descopes the unmet criterion with a documented impact assessment.

---

## 31. Expected Outcomes

Expected outcomes are the observable, measurable states the world will be in if FactoryOS succeeds. They are distinct from objectives (internal) and KPIs (operational); outcomes are external and verifiable.

### 31.1 Outcome Catalogue

| ID | Expected Outcome | Horizon | Verification |
|---|---|---|---|
| O-1 | A second AI factory runs on FactoryOS without substrate modification. | M6 | SC-1; public onboarding record. |
| O-2 | An enterprise deploys FactoryOS in an air-gapped environment. | M5 | SC-8; design-partner reference. |
| O-3 | A primary provider is swapped without an engineering project. | M3 | KPI-O2; swap record. |
| O-4 | An audit of a production run is completed via query, not archaeology. | M3 | KPI-G1; audit demo. |
| O-5 | A production run survives a process restart and resumes. | M3 | SC-4; restart demo. |
| O-6 | A recoverable failure is healed without human intervention. | M4 | SC-6; chaos test record. |
| O-7 | The architecture of a running factory is queryable as code. | M4 | SC-7; twin query. |
| O-8 | Operating N factories costs less than N × operating one. | M7 | BO-2; cost model. |
| O-9 | FactoryOS is referenced as a category (not a framework). | M8 | External references; analyst note. |
| O-10 | A new factory type reaches production in ≤ 90 days. | M6 | BO-8; onboarding record. |

### 31.2 Outcome vs. Output

| Type | Example |
|---|---|
| **Output** (what we produce) | A durable execution substrate. |
| **Outcome** (what changes in the world) | A production run survives a restart (O-5). |

EA-001 is accountable for outcomes, not outputs. Outputs are specified in downstream AKB entries.

### 31.3 Negative Outcomes (What Success Does NOT Look Like)

| Anti-Outcome | Why It's Failure |
|---|---|
| FactoryOS is widely used as a workflow engine. | Category drift (R-1); the thesis failed. |
| FactoryOS only runs ShortsFactory. | Generality thesis failed (A-1, R-8). |
| FactoryOS requires a specific provider. | Provider independence failed (CON-1, R-3). |
| FactoryOS is fast but ungoverned. | Governance thesis failed (P-2). |
| FactoryOS is governed but unobservable. | Observability thesis failed (P-8). |

---

## 32. Open Questions

Open questions are unresolved issues that EA-001 intentionally leaves open. Each is owned and has a resolution path (usually an ADR). Open questions are not gaps in the document; they are explicit acknowledgments of where intent ends and design begins.

| ID | Open Question | Owner | Resolution Path | Target |
|---|---|---|---|---|
| OQ-1 | Which durable execution engine (Temporal-class vs custom)? | Distributed Systems Architect | ADR (RO-1) | M2 |
| OQ-2 | What is the knowledge graph data model? | Chief Architect | ADR (RO-2) | M4 |
| OQ-3 | What is the digital twin a twin *of*? | Chief Architect | ADR (RO-3) | M4 |
| OQ-4 | Which failure classes are safe to auto-heal? | SRE Architect | ADR (RO-4) | M4 |
| OQ-5 | What does the system document autonomously vs what requires human authorship? | Chief Architect | ADR (RO-5) | M4 |
| OQ-6 | Is a governance DSL required, or is policy-as-code sufficient? | Enterprise Architect | ADR (RO-6) | M1 |
| OQ-7 | What is the multi-tenant isolation boundary? | Security Architect | ADR (RO-7) | M5 |
| OQ-8 | At what granularity is cost observed and bounded? | Platform Eng Lead | ADR (RO-8) | M2 |
| OQ-9 | Is Kubernetes the floor runtime, or is a lighter substrate sufficient? | Platform Eng Lead | ADR | M1 |
| OQ-10 | How are human approval gates delivered (UI, API, webhook)? | Product Leadership | ADR | M1 |
| OQ-11 | What is the contract versioning and deprecation policy? | Principal Engineer | ADR (EO-9) | M5 |
| OQ-12 | How is the ARB chartered and operated? | Chief Architect | ARB charter | M0 |
| OQ-13 | What is the reference factory's (ShortsFactory) boundary vs the substrate? | Chief Architect | ADR | M1 |
| OQ-14 | How are provider plugins discovered, signed, and verified? | Security Architect | ADR | M2 |
| OQ-15 | What is the failure-injection / chaos test methodology? | SRE Architect | ADR | M4 |

### 32.1 Open Question Discipline

- An open question must have an owner and a target milestone.
- An open question may not remain open past its target milestone without ARB approval.
- Resolving an open question produces an ADR, which is then governed by CON-14.

---

## 33. References

### 33.1 Standards and Frameworks

| Reference | Usage |
|---|---|
| ISO/IEC/IEEE 42010:2022 — Systems and software engineering — Architecture description | Document structure; architecture viewpoint alignment. |
| arc42 v9 — Architecture documentation template | Section organization; documentation quality. |
| C4 Model v2.0 — Context, Container, Component, Code | Future reference architecture (EA-003) will use C4 levels. |
| RFC 2119 — Key words for use in RFCs (shall, must, should, may) | Conformance language (Package A, Conventions). |
| AWS Well-Architected Framework | Operational excellence, reliability, performance, cost, security pillars. |
| Google SRE Book — Site Reliability Engineering | Error budgets, SLOs, MTTR, toil. |
| Microsoft Azure Architecture Center conventions | Document style, review culture. |
| Netflix Engineering principles | Chaos engineering, self-healing precedent. |
| IBM Architecture Handbook | Enterprise architecture method. |
| ISO/IEC 42001 — AI management system standard | Regulatory readiness (BO-7). |
| NIST AI Risk Management Framework (AI RMF 1.0) | Risk management alignment. |
| EU AI Act | Regulatory context (A-CTX-4). |
| OpenTelemetry specification | Observability (EO-4, CON-8). |
| Model Context Protocol (MCP) specification | Tool interface boundary (P-5, §12.3.6). |

### 33.2 Internal References

| Reference | Usage |
|---|---|
| ARCHITECTURE_DECISIONS.md (ShortsFactory codebase) | ADRs 1–14; implementation-level precedents for AD-1, AD-4, AD-10. |
| gen-v/factory/blueprint.json | Workflow profile (quiz/story/news); informs reference factory scope. |
| gen-v/ai/ (capability registry, router, providers, event bus) | Implementation precedents for substrate concepts. |
| gen-v/agents/ | Worker/Department precedents. |

### 33.3 Comparative Systems Referenced

| System | Reference Context |
|---|---|
| LangGraph | §12.3.1 |
| CrewAI | §12.3.2 |
| AutoGen | §12.3.3 |
| Semantic Kernel | §12.3.4 |
| Temporal | §12.3.5 |
| MCP | §12.3.6 |
| Airflow | §12.3.7 |
| Prefect | §12.3.8 |
| Kubernetes | §12.3.9 |
| OS Kernels | §12.3.10 |

---

## 34. Cross-References

| Reference | Relationship |
|---|---|
| [Package A](./Package-A-Executive.md) | Vision and mission these risks bound. |
| [Package B](./Package-B-Context-Drivers.md) | Drivers these risks threaten. |
| [Package C](./Package-C-Objectives-KPIs.md) | Objectives these risks constrain. |
| [Package E](./Package-E-ARB-Review.md) | ARB checklist and glossary. |
| EA-002 (planned) | Architectural Principles — will derive from guiding philosophy (§28). |
| EA-003 (planned) | Reference Architecture — will implement the roadmap (§30). |
| ADR series EA-100+ (planned) | Will resolve open questions (§32). |

---

> **End of Package D.** Package D bounds the vision with risks, assumptions, philosophy, long-term vision, roadmap, outcomes, and open questions. Package E performs the editorial review, consistency check, and ARB checklist that qualifies EA-001 for review.