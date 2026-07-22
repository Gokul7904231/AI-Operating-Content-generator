# Architecture Decision Records (ADR): ShortFactory

This document records the major architectural decisions, context, alternatives considered, and consequences for the **ShortFactory** content engine framework.

---

## ADR 1: Capability-First Layer (Registry & Router)

### Context
In the early versions of ShortFactory, agents and API routes were bound directly to hardcoded providers (e.g. calling Gemini GenAI or Groq directly). This made it difficult to switch models or add new providers without modifying core agent logic.

### Decision
We introduce an **AI Capability Layer** as the primary interface. Agents ask for task capabilities (e.g. `SCRIPT` version `v1` with `JSON` requirements) rather than requesting specific model names. An **Intelligent Router** handles capability negotiation and resolves the best provider/model plugin.

### Alternatives Considered
- **Provider-First Abstraction:** Agents query providers, which return models. Rejected because it forces agents to know which provider has which model.
- **Direct Agent Bindings:** Keeping things hardcoded. Rejected as unsustainable for a multi-tenant platform.

### Consequences
- **Pros:** Agents are decoupled from model name changes; allows seamless cloud-to-local shifts.
- **Cons:** Slight runtime overhead for model negotiation (mitigated by in-memory caching).

---

## ADR 2: Pluggable Providers & Models

### Context
The AI landscape changes weekly; new providers emerge, and model pricing drops. Hardcoding provider support inside one monolithic routing class results in high maintenance overhead.

### Decision
Evolve all providers and model families into self-contained plugins conforming to the `AIProviderPlugin` and `BaseModelPlugin` specifications. Plugins ship with metadata manifests, allowing auto-registration.

### Alternatives Considered
- **Single Provider Adapter:** A single monolithic class handling all APIs. Rejected because Google, OpenRouter, Groq, and local runtimes use fundamentally different authentication, endpoint shapes, and execution APIs.

### Consequences
- **Pros:** Third-party developers can write custom plugins by dropping them into a plugins directory. Solves technical debt.
- **Cons:** Requires strict adherence to contract interfaces.

---

## ADR 3: Local SQLite Database for Benchmarking

### Context
We need to track provider latency, errors, pricing telemetry, and prompt completion ratings (hook scores, scene quality, video success). Storing this raw performance data is necessary to drive adaptive routing.

### Decision
Implement a local SQLite database (`local-ai/benchmarks.db`) with an in-memory runtime fallback. The Benchmark Recorder registers every call's performance metrics directly into this database.

### Alternatives Considered
- **Firestore Logging:** Storing telemetry in Firestore. Rejected because database writes/reads to Firestore incur API costs and add network latency to every model call.
- **File-based Logs:** Writing logs to a `.log` or `.json` file. Rejected because querying averages and rates across thousands of records is slow and complex compared to SQL queries.

### Consequences
- **Pros:** Zero-cost, local, high-speed telemetry collection. Easily queryable via standard SQL.
- **Cons:** Requires file write permissions and SQLite runtime availability (mitigated by memory-only fallback).

---

## ADR 4: Dynamic Model Discovery with Memory Cache

### Context
OpenRouter, Google, and NVIDIA release new models frequently. Hardcoding model registries inside the codebase means models become stale within weeks.

### Decision
Providers query their discovery endpoints dynamically on boot/interval and cache the results in-memory with a 24-hour expiration TTL. Models are dynamically tagged with capabilities based on API responses.

### Alternatives Considered
- **Hardcoded Model Lists:** Easiest to implement, but requires code changes every time a model is deprecated or added.
- **Firestore Model Cache:** Storing discovered lists in Firestore. Rejected to avoid Firestore read costs on startup.

### Consequences
- **Pros:** Models are always up-to-date. Automatically detects new models installed in local Ollama/LM Studio servers.
- **Cons:** Initial startup fetch can add up to 2 seconds of latency (cached thereafter).

---

## ADR 5: Local-First (Offline Mode) Capabilities

### Context
Computing video renders, TTS, and script generations in the cloud can accumulate high usage fees. Developers and power users need a way to run the entire factory locally on consumer hardware.

### Decision
Introduce a first-class `Local AI Manager` that detects Ollama, LM Studio, or llama.cpp servers, alongside an `Offline Mode` routing profile that completely blocks outbound cloud requests and forces all capabilities onto local endpoints.

### Alternatives Considered
- **Cloud-Only Architecture:** Easiest for development but expensive for development.

### Consequences
- **Pros:** Zero-cost local development and high privacy for enterprise users.
- **Cons:** Local performance is limited by the host machine's hardware capabilities.

---

## ADR 6: Event-Driven Control Plane (Rule 1)

### Context
As ShortFactory evolves into an autonomous factory, components (agents, compiler, metrics, publisher) need to react to state changes in real-time. Forcing synchronous execution blocks the main thread and tightly couples steps together.

### Decision
We introduce a central, asynchronous `EventBus`. Components publish standard events (`script.generated`, `critic.failed`, etc.), and downstream adapters subscribe to relevant channels. 

### Alternatives Considered
- **Monolithic Function Cascades:** Hardcoding orchestrator callback chains. Rejected as it creates spaghetti code and prevents adding independent loggers, metrics, or notifications.

### Consequences
- **Pros:** Total decoupling. New features (e.g. sending a Telegram alert when a render finishes) can be added simply by subscribing to the event channel.
- **Cons:** Tracing execution flows becomes harder without structured Span/Trace IDs (mitigated by incorporating OpenTelemetry traces).

---

## ADR 7: Separate Runtime Engine from Registry (Rule 5)

### Context
Executing provider calls requires managing retries, timeouts, cancellation, and logging. Putting this execution logic in the model/provider registry classes violates Single Responsibility Principles.

### Decision
We completely separate the `Registry` (which only loads manifests and metadata) from the `AIRuntimeEngine` (which wraps and executes provider requests with full timeout, retry, and trace orchestration).

### Consequences
- **Pros:** Cleaner code separation. Adding new capabilities doesn't change execution control logic.
- **Cons:** Adds a layered step to provider execution.

---

## ADR 8: Cancellation & Timeout Guards (Section 6)

### Context
Generating videos can take a long time, and external APIs can hang indefinitely. Users need to abort active generations, and the system must time out hanging requests to failover safely.

### Decision
The `AIRuntimeEngine` wraps executions with an `AbortSignal` and races them against a timeout threshold. If cancelled or timed out, the adapter signal is aborted, network fetch is cancelled, and execution stops immediately.

### Consequences
- **Pros:** Protects against compute drains and infinite loops. Better user experience.
- **Cons:** Requires all downstream execution adapters to accept and handle `AbortSignal` propagation.

---

## ADR 9: Stateless Agent & Data-Driven Workflow Engine (Rules 2 & 3)

### Context
Hardcoding the sequence of agent invocations limits the factory to a single content format (like a standard Quiz). Evolving the factory for other types (GK, News, Motivation) requires code changes.

### Decision
We enforce that all Agent adapters are strictly stateless, loading state from or writing state to Firestore/Knowledge Layer. Workflows are represented as list data templates (e.g., `["script", "critic", "scene", "voice", "image", "metadata"]`), which are processed sequentially by the `Orchestrator Agent`.

### Consequences
- **Pros:** Workflows are highly customizable by users without changing backend code.
- **Cons:** Requires a structured coordinator loop to pass payloads between stages.

---

## ADR 10: Normalized Capability Matrix Standard

### Context
Different providers return model metadata in disparate formats (OpenRouter JSON structures differ from Google Vertex lists). The router needs a standardized structure to execute capability checks.

### Decision
We introduce the `CapabilityMatrix` interface. Every discovered model is normalized into this structure mapping capabilities (`script`, `image`, etc.), support capabilities (`json`, `streaming`, etc.), and limits (`contextWindow`, `maxOutputTokens`).

### Consequences
- **Pros:** Simple, unified logic inside the resolver and router.
- **Cons:** Requires providers to write a normalization translator inside `discoverModels()`.

---

## ADR 11: Unified Provider Lifecycle Hooks

### Context
Loading models, preparing local runtimes, and checking authorization credentials are tasks that occur across different providers but lack structured triggers.

### Decision
We establish core lifecycle methods (`initialize`, `discoverModels`, `warmup`, `execute`, `shutdown`, `cleanup`) implemented by `AIProviderPlugin`.

### Consequences
- **Pros:** Guarantees providers initialize, warmup, and dispose of resources consistently.
- **Cons:** Requires all plugins to define lifecycle stubs even if not fully used.

---

## ADR 12: Hardware-Aware Resource Management

### Context
Running local models requires sufficient GPU VRAM and CPU load buffers. If a local model runs when the system is under high memory pressure, it can crash the runtime.

### Decision
The `ResourceManager` tracks host load metrics (CPU, GPU, RAM). The router performs hardware-aware checks, shifting execution to cloud fallbacks when resource limits are exceeded.

### Consequences
- **Pros:** Prevents local execution crashes under high load.
- **Cons:** Requires local system polling utilities.

---

## ADR 13: Secrets & Credential Manager with Account Pools

### Context
A production factory needs to rotate API keys to prevent quota exhaustion and rate limiting blocks across different provider accounts.

### Decision
We implement a `CredentialManager` supporting encrypted keys, provider aliases, and automated rotation pools. Key pools are rotated automatically when a quota block or rate limit error occurs.

### Consequences
- **Pros:** Robust production uptime; key rotation occurs without restarting processes.
- **Cons:** Adds complexity to credential setup.

---

## ADR 14: Dynamic Capability Policy Engine

### Context
Routing constraints (maximum budget, JSON mode compliance, confidence thresholds) vary depending on the active deployment Profile.

### Decision
The router queries the `PolicyEngine` to match the target capability policy parameters, evaluating models against strict metrics limits.

### Consequences
- **Pros:** Router configuration is entirely data-driven.
- **Cons:** Adds a matching pass to capability routing.
