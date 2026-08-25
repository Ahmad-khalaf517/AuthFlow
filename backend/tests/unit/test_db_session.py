"""Unit tests for connect_args gating -- SSL should never be forced onto a
Postgres connection that doesn't advertise it (e.g. a local docker-compose
Postgres), only onto ones that do (e.g. Neon).
"""

from app.core.config import settings
from app.db.session import _connect_args


def test_postgres_with_ssl_enabled_gets_an_ssl_context(monkeypatch):
    monkeypatch.setattr(settings, "DATABASE_URL", "postgresql+asyncpg://u:p@host/db")
    monkeypatch.setattr(settings, "DB_SSL", True)

    assert "ssl" in _connect_args()


def test_postgres_with_ssl_disabled_gets_no_connect_args(monkeypatch):
    monkeypatch.setattr(settings, "DATABASE_URL", "postgresql+asyncpg://u:p@postgres/db")
    monkeypatch.setattr(settings, "DB_SSL", False)

    assert _connect_args() == {}


def test_sqlite_never_gets_an_ssl_context_regardless_of_db_ssl(monkeypatch):
    monkeypatch.setattr(settings, "DATABASE_URL", "sqlite+aiosqlite:///./x.db")
    monkeypatch.setattr(settings, "DB_SSL", True)

    assert _connect_args() == {}
