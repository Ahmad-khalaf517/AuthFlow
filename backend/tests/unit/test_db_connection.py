"""Unit tests for the dialect gating shared by the application engine and
the Alembic migration environment.

The connect_args cases are a regression guard for a real bug: SSL used to be
forced onto every PostgreSQL connection regardless of DB_SSL. That's correct
for Neon but fatal against the docker-compose Postgres, because asyncpg
treats an SSL context as *required* rather than *preferred* -- a server with
no TLS listener answers 'N' to the SSLRequest and asyncpg raises "rejected
SSL upgrade" instead of falling back to plaintext.
"""

import pytest

from app.db.connection import connect_args, is_postgresql, pool_kwargs

POSTGRES_URL = "postgresql+asyncpg://u:p@host/db"
SQLITE_URL = "sqlite+aiosqlite:///./x.db"

POOL_SETTINGS = {"pool_size": 5, "max_overflow": 10, "pool_recycle": 1800}


def test_postgres_with_ssl_enabled_gets_an_ssl_context():
    assert "ssl" in connect_args(POSTGRES_URL, use_ssl=True)


def test_postgres_with_ssl_disabled_gets_no_connect_args():
    # The docker-compose case. This is the one that used to be wrong.
    assert connect_args(POSTGRES_URL, use_ssl=False) == {}


@pytest.mark.parametrize("use_ssl", [True, False])
def test_sqlite_never_gets_an_ssl_context(use_ssl):
    assert connect_args(SQLITE_URL, use_ssl=use_ssl) == {}


def test_postgres_gets_pool_sizing():
    assert pool_kwargs(POSTGRES_URL, **POOL_SETTINGS) == POOL_SETTINGS


def test_sqlite_gets_no_pool_sizing():
    # SQLite's default pool class doesn't accept these kwargs at all, so
    # passing them through would raise rather than just being ignored.
    assert pool_kwargs(SQLITE_URL, **POOL_SETTINGS) == {}


def test_backend_detection_distinguishes_the_two_dialects():
    assert is_postgresql(POSTGRES_URL)
    assert not is_postgresql(SQLITE_URL)
