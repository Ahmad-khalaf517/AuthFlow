"""Shared pytest fixtures for unit and integration tests.

The suite runs against an isolated in-memory SQLite database by default:
fast, zero-config, and the gate that runs on every push. Point
TEST_DATABASE_URL at a PostgreSQL server to run the same tests against the
real thing -- CI does this in a second job, because it's the only way the
migration chain, the pg_trgm indexes and asyncpg itself ever execute.

Either way it is never the application's own DATABASE_URL, which may point
at a live Neon instance. That used to be a comment; the check below makes
it an assertion.
"""

import os
import subprocess
import sys
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool, StaticPool

from app.api.deps import get_db, login_rate_limiter
from app.core.config import settings
from app.db.base import Base
from app.db.connection import is_postgresql
from app.main import app
from app.models.user import User  # noqa: F401  (registers the table on Base.metadata)

BACKEND_DIR = Path(__file__).resolve().parents[1]

SQLITE_URL = "sqlite+aiosqlite:///:memory:"
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", SQLITE_URL)
RUNNING_ON_POSTGRES = is_postgresql(TEST_DATABASE_URL)

if TEST_DATABASE_URL == settings.DATABASE_URL:
    raise RuntimeError(
        "TEST_DATABASE_URL is the application's own DATABASE_URL. Every test "
        "clears every table, so point it at a throwaway database instead."
    )


def _engine_options() -> dict:
    if RUNNING_ON_POSTGRES:
        # NullPool rather than the default: pytest-asyncio gives each test
        # its own event loop, and an asyncpg connection belongs to the loop
        # that opened it. A pooled connection handed to the next test would
        # be bound to a loop that no longer exists.
        return {"poolclass": NullPool}
    # One shared connection is what makes ":memory:" a single database for
    # the whole run rather than a fresh empty one per connect.
    return {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool}


test_engine = create_async_engine(TEST_DATABASE_URL, **_engine_options())
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(scope="session", autouse=True)
def _postgres_schema() -> None:
    """PostgreSQL builds its schema from the migrations, which is the whole
    point of running against it -- `CREATE EXTENSION pg_trgm` and the
    gin_trgm_ops indexes in 599f1c2ee189 execute nowhere else. SQLite can't
    run that migration at all, so it stays on create_all (see _reset_db).

    Shelled out rather than driven through Alembic's Python API: env.py ends
    in asyncio.run(), which raises if a loop is already running.
    """
    if not RUNNING_ON_POSTGRES:
        return
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        env={**os.environ, "DATABASE_URL": TEST_DATABASE_URL},
        check=True,
    )


@pytest_asyncio.fixture(autouse=True)
async def _reset_db() -> AsyncGenerator[None, None]:
    """SQLite rebuilds the schema around every test -- cheap against an
    in-memory database, and deliberately unchanged so the fast gate stays
    fast.

    PostgreSQL keeps the migrated schema for the whole session and only
    clears rows. Dropping and re-running the migration chain per test would
    dominate the runtime, and would throw away the very schema this job
    exists to exercise. Cleaning before rather than after also means a run
    that died mid-test doesn't poison the next one.
    """
    if RUNNING_ON_POSTGRES:
        async with test_engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                await conn.execute(table.delete())
        yield
    else:
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        yield
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(autouse=True)
def _reset_rate_limiter() -> None:
    # The rate limiter is a module-level singleton so it works correctly in
    # the real running app; without this, every test's login calls would
    # share one counter across the whole suite and start 429ing each other.
    login_rate_limiter.reset()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
