# 🔍 BYOLM Forensic Audit & Discovery Report — FactoryOS v1

**Role:** Principal Software Architect, AI Infrastructure Engineer, Security Architect  
**Scope:** Repository discovery of existing AI provider interfaces, registry, local AI manager, routing pipeline, and security boundaries prior to Bring Your Own Local Model (BYOLM) integration.

---

## 1. 🗺️ Existing AI Provider Architecture

FactoryOS v1 already implements a plugin-based AI capability architecture under `gen-v/ai/`:

- **`ai/capability-registry.ts`**: Defines `AIProviderRegistry`, `AIProviderPlugin`, `ModelMeta`, `ProviderHealthMetrics`, and `AICapability` (`SCRIPT`, `IMAGE`, `SPEECH`, `VISION`, `EMBEDDING`, `RERANKING`).
- **`ai/intelligent-router.ts`**: Defines `IntelligentRouter`, which selects the optimal provider based on capabilities, cost, latency, and health scores.
- **`ai/model-discovery.ts`**: Handles automatic polling and caching of model lists from all registered plugins.
- **`ai/providers/google.ts`**: Implements `GoogleProvider` using `gemini-1.5-flash`.
- **`ai/providers/local-ai-manager.ts`**: Implements `LocalAIManagerPlugin` (registered as `local`), orchestrating Ollama (`http://127.0.0.1:11434`), LM Studio (`http://127.0.0.1:1234`), and llama.cpp (`http://127.0.0.1:8080`).

---

## 2. 🔌 Existing Provider & Model Contracts

```typescript
export interface AIProviderPlugin {
  id: string;
  name: string;
  manifest: PluginManifest;
  discoverModels(): Promise<ModelMeta[]>;
  health(): Promise<boolean>;
  priority(): number;
  execute(capability: AICapability, params: any, signal?: AbortSignal): Promise<any>;
  status(): ProviderHealthMetrics;
  updateConfig?(config: { apiKey?: string; baseUrl?: string; options?: any }): void;
}
```

Every model discovered is represented as:

```typescript
export interface ModelMeta {
  id: string; // e.g. "local/ollama/llama3:8b"
  name: string; // e.g. "Ollama: llama3:8b"
  provider: string; // "local"
  capabilities: AICapability[];
  contextWindow: number;
  costInput: number; // 0 for local models
  costOutput: number; // 0 for local models
  speed: number; // tps
  health: number;
  availability: boolean;
  isLocal: boolean;
  tags?: string[];
}
```

---

## 3. 🎯 Target BYOLM Architecture

```
                         FACTORYOS AI ROUTER
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
          CLOUD PROVIDERS                    LOCAL AI
                 │                                 │
        ┌────────┴────────┐              ┌─────────┴──────────┐
        │                 │              │                    │
      Google          Other APIs      Ollama              LM Studio
        │                                │                    │
 Gemini 1.5 Flash                    User's models        User's models
```

---

## 4. 🛡️ Frozen File Protection Checklist

The following 10 frozen files must remain **100% untouched** (0 modifications):

1. `agents/script-agent.ts`
2. `agents/quiz-corrector-agent.ts`
3. `app/api/quiz/compile/route.ts`
4. `app/api/quiz/generate/route.ts`
5. `app/api/quiz/geo/route.ts`
6. `app/api/quiz/mock/route.ts`
7. `app/api/quiz/render-batch/route.ts`
8. `content-engines/quiz/critic.json`
9. `content-engines/quiz/index.ts`
10. `lib/core/QuestionOptimizer.ts`

---

## 5. 🔒 Security & Provenance Rules for BYOLM

1. **No Hardcoded / Fabricated Metrics**:
   - `estimatedCostUsd`: `null` for local models (zero cloud cost).
   - `tokens`: Recorded ONLY if Ollama/LM Studio HTTP response contains token counts; otherwise `unavailable`.
2. **SSRF Prevention**:
   - Server-side connection tests validate that endpoints resolve to valid HTTP/HTTPS URLs and disallow intranet loops into unauthorized cloud metadata services (`http://169.254.169.254`).
3. **Model Discovery**:
   - Discovered models populate dynamically from Ollama (`GET /api/tags`) and LM Studio (`GET /v1/models`). The UI never hardcodes model lists.
