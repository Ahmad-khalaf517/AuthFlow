"""Global exception handlers."""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.exceptions import AppError

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Catches anything that isn't an AppError, an HTTPException, or a
        RequestValidationError (FastAPI/Starlette already register more
        specific handlers for those, which take precedence) -- i.e. genuine
        bugs. Without this, an unhandled exception falls through to
        Starlette's default handler, which returns a *plain-text* 500
        instead of matching every other error response's JSON shape, and
        the traceback is only visible in server logs either way -- this
        just makes sure the client-facing shape stays consistent too.
        """
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
