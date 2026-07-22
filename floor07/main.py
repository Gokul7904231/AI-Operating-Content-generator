"""Application Entrypoint for Floor 07 FastAPI service."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.api.middleware.error_handler import ErrorHandlingMiddleware
from app.api.middleware.request_id import RequestIdMiddleware
from app.api.v1.health import router as health_router
from app.api.v1.validation import router as validation_router
from app.core.config import get_settings
from app.core.constants import API_DESCRIPTION, API_TITLE, API_V1_PREFIX
from app.logging.setup import setup_logging
from app.infrastructure.cache.redis_client import get_redis_client

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and Shutdown event handler lifecycle hook."""
    settings = get_settings()
    setup_logging(log_level=settings.log_level, log_format=settings.log_format)
    logger.info("app_starting", version=settings.app_version)

    # Initialize cache client on startup
    redis_client = get_redis_client()
    pong = await redis_client.ping()
    logger.info("redis_connection_status", connected=pong)

    yield

    # Clean up resources on shutdown
    logger.info("app_stopping")
    await redis_client.close()


def create_app() -> FastAPI:
    """Build and configure the FastAPI application instance."""
    settings = get_settings()

    app = FastAPI(
        title=API_TITLE,
        description=API_DESCRIPTION,
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── Middlewares ──
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(ErrorHandlingMiddleware)
    app.add_middleware(RequestIdMiddleware)

    # ── Routes ──
    app.include_router(health_router)
    app.include_router(validation_router, prefix=API_V1_PREFIX)

    return app


app = create_app()
