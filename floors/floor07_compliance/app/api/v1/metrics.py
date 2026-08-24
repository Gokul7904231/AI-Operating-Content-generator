"""Prometheus metrics HTTP endpoint.

Exposes all registered metrics at GET /metrics in the standard
Prometheus text format.

Security note: In production, this endpoint should be restricted to
internal networks or protected by a reverse proxy. Set METRICS_ENABLED=false
to disable it entirely when deploying behind a gateway that scrapes internally.
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.core.config import get_settings

router = APIRouter()


@router.get(
    "/metrics",
    include_in_schema=False,  # Hide from public Swagger docs
    response_class=Response,
)
async def metrics() -> Response:
    """Prometheus metrics scrape endpoint."""
    settings = get_settings()
    if not getattr(settings, "metrics_enabled", True):
        return Response(status_code=404)

    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
