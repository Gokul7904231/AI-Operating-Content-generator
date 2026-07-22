# ShortFactory OS — System Architecture Diagram

```
                       [ USER / SCHEDULER ]
                                │
                                ▼
                       [ Workflow Loader ] ◄── resolves prompt slugs
                                │
                                ▼
                       [ Workflow Runtime ]
                                │
       SCRIPT capability       ▼
                 ┌─────────────┴─────────────┐
                 │    Intelligent Router     │
                 └─────────────┬─────────────┘
                               ▼
                    [ AI Provider Registry ] ── (Gemini / Groq / OpenRouter)
                               │
                               ▼
                      [ Scene breakdown ]
                               │
                               ▼
                    [ Media Synthesizers ] ──── (ElevenLabs TTS / Stable Diffusion)
                               │
                               ▼
                    [ FFmpeg Assembler ] ────── (audio + image stitch)
                               │
                               ▼ emits render.completed
                       [ Storage Queue ] ────── (SQLite persistent / idempotent)
                               │
                               ▼ uploads mp4/jpg/json
                     [ Google Drive Sync ]
                               │
                               ▼ emits storage.upload.completed
                      [ Publisher Queue ] ───── (SQLite persistent / idempotent)
                               │
                               ▼ insertions API
                       [ YouTube Client ]
                               │
                               ▼ feedback scores
                     [ Learning Loop Engine ] ── records metrics to SQLite
```

---

### Architectural Principles

1. **Strict Decoupling**: Renders never wait for third-party uploads. Communication is driven entirely via the EventBus (`render.completed`, `storage.upload.completed`).
2. **SQLite WAL Mode Queue**: Avoids heavy infra dependencies (Redis/Kafka) while securing 100% data preservation across server restarts and OS crashes.
3. **Capability-driven Routing**: The workflow runtime asks for capabilities (e.g. `SCRIPT`, `IMAGE`) rather than calling raw models (e.g. `gpt-4o`). The router hot-evaluates price, speed, and reliability benchmarks before selecting the best model.
4. **Zero-Downtime Hot Swapping**: Critical operations like Service Account key rotation verify credentials first before signaling providers to rebuild clients.
