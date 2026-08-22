"""Async SQLAlchemy engine and session factory."""
import ssl
from collections.abc import AsyncGenerator

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def _connect_args() -> dict:
    """SSL for hosted Postgres (e.g. Neon).

    asyncpg doesn't understand libpq-style URL params like `sslmode` /
    `channel_binding` (it raises a TypeError if they're present), so SSL is
    configured here via connect_args instead of the connection string.
    """
    if make_url(settings.DATABASE_URL).get_backend_name() == "postgresql":
        return {"ssl": ssl.create_default_context()}
    return {}


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,  # guards against stale connections after Neon's idle auto-suspend
    connect_args=_connect_args(),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
