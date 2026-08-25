"""Structured (JSON) logging with request-ID correlation.

A single handler on the root logger means every logger in the process --
including `sqlalchemy.engine` (propagates to root by default) and
`uvicorn.access` -- gets the same JSON shape and the same request_id
filter, so a DB query line and the endpoint that issued it show up under
the same request_id without either layer having to know about the other.
"""

import contextvars
import json
import logging
import sys
from typing import Any

request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id", default=None
)


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", None),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def configure_logging(level: str = "INFO") -> None:
    """Replaces the default handler setup with one JSON handler on the root
    logger. Idempotent -- safe to call more than once (e.g. once from
    app startup and again from a test fixture) without stacking handlers.
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RequestIdFilter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # uvicorn and SQLAlchemy (echo=True) each attach their own plain-text
    # handler directly to their logger the first time they're used, which
    # happens at import time -- before this function runs. Left alone, a
    # record hits that handler *and* propagates up to root's, so every DB
    # query line would be logged twice: once structured, once plain-text
    # and without a request_id. Stripping the library's own handler forces
    # everything through the one handler on root.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "sqlalchemy.engine.Engine"):
        lib_logger = logging.getLogger(name)
        lib_logger.handlers.clear()
        lib_logger.propagate = True
