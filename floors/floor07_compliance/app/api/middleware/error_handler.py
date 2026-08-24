"""FastAPI exception handling middleware that catches all Floor07Error exceptions

and returns structured JSON responses consistently.
"""

from __future__ import annotations

import uuid
from fastapi import Request
from fastapi.responses import ORJSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
import structlog

from app.core.exceptions import Floor07Error

logger = structlog.get_logger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        try:
            return await call_next(request)
        except Floor07Error as exc:
            # Structlog contextual logging
            logger.error(
                "request_error",
                path=request.url.path,
                error_code=exc.error_code,
                message=exc.message,
                detail=exc.detail,
                status_code=exc.status_code,
            )
            return ORJSONResponse(
                status_code=exc.status_code,
                content={
                    "error": {
                        "code": exc.error_code,
                        "message": exc.message,
                        "detail": exc.detail,
                    }
                },
            )
        except Exception as exc:
            logger.critical(
                "unhandled_server_error",
                path=request.url.path,
                error=str(exc),
                exc_info=True,
            )
            return ORJSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "internal_server_error",
                        "message": "An unexpected error occurred.",
                        "detail": "Internal server error.",
                    }
                },
            )
