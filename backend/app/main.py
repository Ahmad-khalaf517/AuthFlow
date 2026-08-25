"""AuthFlow FastAPI application entrypoint."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.core.logging import configure_logging
from app.db.session import engine
from app.middleware.error_handler import register_exception_handlers
from app.middleware.request_context import RequestIDMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    yield
    # Closes every pooled connection cleanly on shutdown instead of letting
    # the process exit drop them, which matters most for graceful restarts
    # (reload, container recycling) where the old process's connections
    # would otherwise linger against the DB until it notices they're dead.
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Added after CORSMiddleware so it ends up outermost (Starlette wraps in
# reverse add order) -- every request gets a request_id, including
# preflight OPTIONS requests CORSMiddleware handles itself.
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["health"])
async def health_check(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    """A load balancer / orchestrator uses this to decide whether to route
    traffic here -- reporting "ok" while the database is actually
    unreachable would be worse than useless, so this does a real (cheap)
    round-trip rather than just returning a static response.

    Goes through the same get_db dependency every other route uses (rather
    than reaching for the `engine` module directly) so it respects the
    same test override -- otherwise this one endpoint would quietly need a
    live connection to the real database during test runs, unlike every
    other endpoint.
    """
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        raise ServiceUnavailableError("Database unavailable") from None
    return {"status": "ok"}
