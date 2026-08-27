"""Dialect-specific engine configuration, shared by the app and Alembic.

Both the application engine ([app/db/session.py]) and the migration
environment ([alembic/env.py]) need the same two answers about a given
DATABASE_URL: does this connection need an SSL context, and does this
dialect accept pool sizing? They used to answer separately, and drifted --
env.py forced SSL onto every PostgreSQL URL regardless of DB_SSL, so
`alembic upgrade head` failed against the docker-compose Postgres (which
has no TLS listener) even though the app connected to it fine. One
implementation here so there's only one answer to keep correct.

Deliberately free of module-level side effects: importing this must not
build an engine, so env.py can use it without pulling in session.py's
module-level create_async_engine call as a side effect of running a
migration.
"""

import ssl
from typing import Any

from sqlalchemy.engine import make_url


def is_postgresql(database_url: str) -> bool:
    return make_url(database_url).get_backend_name() == "postgresql"


def connect_args(database_url: str, *, use_ssl: bool) -> dict[str, Any]:
    """SSL for hosted Postgres (e.g. Neon).

    asyncpg doesn't understand libpq-style URL params like `sslmode` /
    `channel_binding` (it raises a TypeError if they're present), so SSL is
    configured through connect_args instead of the connection string.

    Gated on `use_ssl` rather than applied to every "postgresql" URL: a
    local Postgres via docker-compose doesn't have TLS enabled, and asyncpg
    treats `ssl=<context>` as *required*, not *preferred*. Against a server
    with no TLS listener the connection doesn't fall back to plaintext -- it
    fails outright with "rejected SSL upgrade".
    """
    if is_postgresql(database_url) and use_ssl:
        return {"ssl": ssl.create_default_context()}
    return {}


def pool_kwargs(
    database_url: str, *, pool_size: int, max_overflow: int, pool_recycle: int
) -> dict[str, Any]:
    """Pool sizing only applies to Postgres. SQLite (the zero-config local
    fallback, never used in production) uses a different default pool class
    that doesn't accept these kwargs at all.
    """
    if not is_postgresql(database_url):
        return {}
    return {
        "pool_size": pool_size,
        "max_overflow": max_overflow,
        "pool_recycle": pool_recycle,
    }
