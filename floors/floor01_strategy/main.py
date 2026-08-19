"""Application Entrypoint for Floor 01 (Strategy & Intelligence) FastAPI service with Security Headers."""

from __future__ import annotations

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from floors.floor01_strategy.app.api.v1.strategy import router as strategy_router
from floors.floor01_strategy.app.core.config import get_settings


def create_app() -> FastAPI:
    """Build and configure FastAPI app instance for Floor 01."""
    settings = get_settings()

    app = FastAPI(
        title=f"FactoryOS {settings.floor_id.upper()} — {settings.floor_name}",
        description="FactoryOS Strategy & Intelligence Floor. Generates validated topic selection, channel strategy, content planning, and curriculum mapping payloads for Floor 02.",
        version=settings.floor_version,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    app.include_router(strategy_router)
    return app


app = create_app()
