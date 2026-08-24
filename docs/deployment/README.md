# 🚀 Deployment Guides & Docker Orchestration

Production deployment instructions for FactoryOS services.

## Services Overview
1. **Control Plane (`apps/web/`)**: Next.js 16 container (`apps/web/Dockerfile`).
2. **Compliance Gate (`archive/floor07_compliance_2026-08-23/`)**: FastAPI + PostgreSQL + Redis stack (`archive/floor07_compliance_2026-08-23/docker-compose.yml`).
3. **Rendering Engine (`services/rendering-engine/`)**: Headless FFmpeg render worker (`services/rendering-engine/Dockerfile`).
