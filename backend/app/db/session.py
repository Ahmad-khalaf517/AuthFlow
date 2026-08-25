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

    Gated on settings.DB_SSL (default True) rather than being automatic for
    every "postgresql" URL: a local Postgres via docker-compose doesn't have
    TLS enabled by default, and asyncpg's ssl=<context> means *required*, not
    *preferred* -- passing it against a server with no TLS listener fails the
    connection outright rather than falling back to plaintext.
    """
    if make_url(settings.DATABASE_URL).get_backend_name() == "postgresql" and settings.DB_SSL:
        return {"ssl": ssl.create_default_context()}
    return {}


def _pool_kwargs() -> dict:
    """Pool sizing only applies to Postgres. SQLite (the zero-config local
    fallback, never used in production) uses a different default pool class
    that doesn't accept these kwargs at all.
    """
    if make_url(settings.DATABASE_URL).get_backend_name() == "postgresql":
        return {
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_recycle": settings.DB_POOL_RECYCLE_SECONDS,
        }
    return {}


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,  # guards against stale connections after Neon's idle auto-suspend
    connect_args=_connect_args(),
    **_pool_kwargs(),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
