# 🎬 AI Operating Content Generator (FactoryOS)

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?logo=redis)](https://redis.io/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase)](https://firebase.google.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-CDN-3448C5?logo=cloudinary)](https://cloudinary.com/)

> **FactoryOS** is an enterprise-grade, highly automated microservice suite designed to orchestrate heavy automated content generation, compliance vetting, and high-performance video rendering pipelines.

---

## 🏗️ System Architecture & Data Flow

FactoryOS is split into three decoupled components that communicate securely over HTTPS:

```mermaid
flowchart TD
    subgraph UI & Control ["Next.js Control Plane (gen-v)"]
        UI[Next.js Dashboard]
        Router[Intelligent AI Router]
        Agent[Script & Quiz Agents]
        DB_Bench[(Local SQLite Telemetry)]
    end

    subgraph Compliance ["Quality Gate (floor07)"]
        Gate[FastAPI Compliance Gate]
        Fact[FactWorker: Hallucination Detection]
        Policy[PolicyWorker: Rule Vetting]
        Risk[RiskWorker: Risk Aggregator]
        Cert[CertificateWorker: Cryptographic Signer]
        DB_Postgres[(PostgreSQL Storage)]
        Cache_Redis[(Redis Caching & Idempotency)]
    end

    subgraph Renderer ["Rendering Engine (vps-rendering-engine)"]
        VEngine[FastAPI Rendering Worker]
        TTS[Edge TTS Integration]
        FFmpeg[MoviePy + FFmpeg Pipeline]
    end

    Cloudinary((Cloudinary CDN))
    Firestore[(Firebase Firestore)]

    %% Orchestration Flow
    UI -->|1. Request Content| Router
    Router -->|2. Generate Drafts| Agent
    UI -->|3. Validate Request| Gate
    Gate --> Fact
    Gate --> Policy
    Gate --> Risk
    Gate --> Cert
    Cert -->|Store Cert| DB_Postgres
    Gate -->|Cache Result| Cache_Redis
    
    UI -->|4. If Valid, Trigger Render| VEngine
    VEngine --> TTS
    VEngine --> FFmpeg
    FFmpeg -->|5. Stream Video & Subtitles| Cloudinary
    UI -->|6. Telemetry & Log Jobs| Firestore
    UI -->|7. Performance Profiling| DB_Bench
```

---

## 📦 Core Architecture Modules

### 1. 🛡️ Compliance Gate (`floor07`)
A Python FastAPI microservice serving as the **FactoryOS Quality Gate**. No content can exit the pipeline without receiving a signed compliance certificate from Floor 07.
* **Hexagonal Clean Architecture:** Completely decouples HTTP concerns, use cases, domain entities, and infrastructure layers.
* **Workers Pipeline:**
  * `FactWorker`: Analyzes scripts for factual correctness and hallucination ratings.
  * `PolicyWorker`: Assesses compliance against platform-specific policies (YouTube, TikTok, etc.).
  * `RiskWorker`: Aggregates safety profiles into weighted scores (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  * `CertificateWorker`: Cryptographically signs approved content using SHA-256 hashes and issues certificates.
* **Infrastructure Layer:** Uses PostgreSQL for certificate persistence, Alembic for migrations, and Redis for rate-limiting, policy caching, and API request idempotency.

### 2. 🎬 Control Plane (`gen-v`)
A Next.js 16 application running with Tailwind CSS v4 and Framer Motion that functions as the orchestrator dashboard.
* **Agent Network:** Out-of-the-box agents for automatic scriptwriting, scene composition, and quiz refinement.
* **Intelligent AI Capability Router:** Dynamically binds capabilities (e.g. `SCRIPT v1`, `QUIZ v2`) to optimal models across providers (Google Gemini, Groq, OpenRouter, and local instances).
* **Local-First & Offline Support:** Built-in capability resolver that detects local runtimes (Ollama, LM Studio) and operates in offline-first modes.
* **Telemetry & Benchmarks:** Integrates `better-sqlite3` to track and profile execution latency, model cost metrics, and quality ratings.

### 3. ⚙️ Rendering Engine (`vps-rendering-engine`)
An isolated FastAPI worker designed for heavy compute compilation.
* **Video Compilation:** Utilizes MoviePy and raw FFmpeg command chains to construct video timelines, overlay dynamic components, and render subtitles.
* **Fast Audio Muxing:** Custom FFmpeg multi-threaded stream muxing that reduces standard MoviePy audio-array generation times.
* **Audio Synthesis:** Integrates `edge-tts` to generate high-fidelity voice tracks from scripts.
* **Asset Upload:** Automatically streams output MP4 files and SRT subtitles directly to the Cloudinary CDN.

### 4. 📐 Architecture Knowledge Base (`factoryos-akb`)
Contains enterprise architectural documentation, decisions (ADRs), and guidelines mapping out requirements and evolution blueprints.

---

## 🚀 Getting Started

### Prerequisites
* **Python 3.11+** (with Poetry installed for `floor07` dependency management)
* **Node.js 20+** & **npm 10+**
* **Docker & Docker Compose** (for PostgreSQL and Redis runtimes)
* **System-level FFmpeg** installed and configured on the path

---

### Step-by-Step Setup

#### 1. Setup the Compliance Gate (`floor07`)
Navigate to the compliance directory, build/run the containers, and run migrations:
```bash
cd floor07
# Spin up PostgreSQL and Redis
docker compose up -d

# Install dependencies and run migrations
poetry install
poetry run alembic upgrade head

# Start the API service
poetry run uvicorn main:app --reload --port 8000
```
API Documentation will be available at: `http://localhost:8000/docs`.

#### 2. Setup the Rendering Engine (`vps-rendering-engine`)
Install Python dependencies and start the rendering worker:
```bash
cd vps-rendering-engine
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start the rendering API
python -m uvicorn main:app --reload --port 8080
```

#### 3. Setup the Control Plane (`gen-v`)
Install Node packages and run the Next.js development server:
```bash
cd gen-v
npm install
npm run dev
```
Open `http://localhost:3000` to access the Control Plane Dashboard.

---

## ⚙️ Environment Variables

Each component has specific configuration keys. Create a `.env` file in the root of the respective module.

### `floor07/.env` (Compliance Engine)
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/floor07
REDIS_URL=redis://localhost:6379/0
API_KEY_SECRET=secure-factory-auth-token
LOG_LEVEL=info
```

### `vps-rendering-engine/.env` (Rendering Engine)
```env
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
INTERNAL_API_SECRET_KEY=secure-factory-auth-token
```

### `gen-v/.env` (Next.js Control Plane)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
INTERNAL_API_SECRET_KEY=secure-factory-auth-token
NEXT_PUBLIC_RENDER_ENGINE_URL=http://localhost:8080
NEXT_PUBLIC_COMPLIANCE_GATE_URL=http://localhost:8000
```

---

## 👨‍💻 Repository & Contributing
This repository is configured to push to its primary mirror on GitHub:
* **Target Repository:** `https://github.com/Gokul7904231/AI-Operating-Content-generator`

To configure additional git remote mirrors manually:
```bash
git remote add target https://github.com/Gokul7904231/AI-Operating-Content-generator.git
git push -u target main
```
