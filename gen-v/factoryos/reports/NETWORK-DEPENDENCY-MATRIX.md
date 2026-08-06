# FactoryOS v0.1 — Network Dependency Matrix & Forensic Classification

**Audit Date**: 2026-08-06  
**Auditor**: Principal QA & Release Engineer  

---

## 1. Complete Subsystem Network Dependency Classification

| Subsystem / Capability | Classification | Offline Behavior | Network / Credential Required |
| :--- | :--- | :--- | :--- |
| **Production State Machine** | **LOCAL** | Operates normally in memory | None |
| **Autonomous Scheduler & Daily Quota** | **LOCAL** | Operates normally; persists to `data/production_jobs.json` | None |
| **ProductionIdempotency Engine** | **LOCAL** | Deterministic SHA-256 key matching | None |
| **Quiz Guardian & NLI Evidence Verifier** | **LOCAL** | Uses Transformers.js ONNX (`env.allowRemoteModels = false`) | None |
| **RAG Vector Database & Hybrid Retriever** | **LOCAL** | Dense vector search via local MiniLM ONNX embeddings | None |
| **Video Pipeline MP4 Renderer** | **LOCAL** | Synthesizes real H.264/AAC MP4 video via system FFmpeg | None |
| **Output Artifact Validator** | **LOCAL** | Inspects file existence, size, extension, & header | None |
| **Overseer Audit & Snapshot Plane** | **LOCAL** | Persists timeline to memory and disk stores | None |
| **Supertonic / Silent Voice Synthesis** | **LOCAL** | Generates ONNX / synthetic audio buffers locally | None |
| **Microsoft Edge TTS (`@travisvn/edge-tts`)** | **NETWORK REQUIRED** | Fails offline; requires Microsoft WebSocket endpoints | Internet connection |
| **Remote Stock Visuals (Wikimedia / Cloudinary)** | **NETWORK REQUIRED** | Falls back to local color canvas or cached images | Internet connection / API key |
| **Remote LLM Providers (Groq / OpenAI)** | **NETWORK REQUIRED** | Falls back to `mock_quiz_provider` or local LLM | Internet / API keys |
| **Google Drive Delivery Adapter** | **NETWORK REQUIRED** | Enqueues artifact into `DELIVERY_PENDING` outbox (`data/outbox/`) | Service Account / OAuth credentials & Internet |

---

## 2. Operational Network Modes

1. **`ONLINE`**: All operations (local synthesis, remote LLMs, Microsoft TTS, Google Drive upload) execute directly.
2. **`OFFLINE`**: Local pipeline (Generation via local/mock $\rightarrow$ Guardian $\rightarrow$ FFmpeg render $\rightarrow$ Validation) completes cleanly. Artifact is stored in `DELIVERY_PENDING` local outbox.
