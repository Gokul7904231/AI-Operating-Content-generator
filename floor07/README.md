# Floor 07 — Content Integrity & Compliance
## FactoryOS Quality Gate — Sprint 1 MVP

### Quick Start

```bash
# 1. Start all services
docker compose up --build

# 2. API docs (once running)
open http://localhost:8000/docs

# 3. Health check
curl http://localhost:8000/health

# 4. Validate content
curl -X POST http://localhost:8000/v1/validate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Python Tutorial: Variables Explained",
    "script": "In Python, variables store values. You assign them with the equals sign.",
    "metadata": {"tags": ["python", "programming", "tutorial"]},
    "platform": "youtube",
    "language": "en",
    "content_type": "educational_short"
  }'
```

### Development

```bash
# Install dependencies
poetry install

# Run locally (requires Postgres + Redis running)
poetry run uvicorn main:app --reload --port 8000

# Run tests
make test

# Lint + format
make lint
make format

# Run migrations
make migrate
```

### Makefile targets

| Target | Description |
|---|---|
| `make up` | Start Docker Compose stack |
| `make down` | Stop Docker Compose stack |
| `make build` | Rebuild Docker images |
| `make test` | Run full test suite |
| `make lint` | Run ruff linter |
| `make format` | Run black formatter |
| `make migrate` | Apply Alembic migrations |
| `make makemigrations` | Generate new migration |
| `make logs` | Tail API logs |

### Architecture

```
POST /v1/validate
       │
       ▼
 ValidationPipeline
       │
       ├─► FactWorker          (factual confidence + hallucination detection)
       │
       ├─► PolicyWorker        (platform policy rule evaluation)
       │
       ├─► RiskWorker          (weighted risk aggregation → LOW/MEDIUM/HIGH/CRITICAL)
       │
       └─► CertificateWorker  (SHA-256 signed certificate → stored in Postgres)
```

### Environment Variables

See `.env.example` for all required variables.
