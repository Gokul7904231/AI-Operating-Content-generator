# 🚀 Deployment Guides & Docker Orchestration

Production deployment instructions for FactoryOS services.

## Services Overview
1. **Control Plane (`gen-v/`)**: Next.js 16 container (`gen-v/Dockerfile`).
2. **Compliance Gate (`floor07/`)**: FastAPI + PostgreSQL + Redis stack (`floor07/docker-compose.yml`).
3. **Rendering Engine (`vps-rendering-engine/`)**: Headless FFmpeg render worker (`vps-rendering-engine/Dockerfile`).
