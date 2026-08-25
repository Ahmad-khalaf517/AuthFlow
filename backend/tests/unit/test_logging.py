"""Unit tests for structured logging: JSON shape and request_id correlation."""

import json
import logging

from app.core.logging import JsonFormatter, RequestIdFilter, request_id_ctx


def _make_record(msg: str = "hello", exc_info=None) -> logging.LogRecord:
    return logging.LogRecord(
        name="app.test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg=msg,
        args=(),
        exc_info=exc_info,
    )


def test_request_id_filter_attaches_current_context_value():
    token = request_id_ctx.set("req-123")
    try:
        record = _make_record()
        assert RequestIdFilter().filter(record) is True
        assert record.request_id == "req-123"
    finally:
        request_id_ctx.reset(token)


def test_request_id_filter_defaults_to_none_outside_a_request():
    record = _make_record()
    RequestIdFilter().filter(record)
    assert record.request_id is None


def test_json_formatter_produces_valid_json_with_expected_fields():
    record = _make_record("something happened")
    record.request_id = "req-abc"

    formatted = JsonFormatter().format(record)
    payload = json.loads(formatted)

    assert payload["level"] == "INFO"
    assert payload["logger"] == "app.test"
    assert payload["message"] == "something happened"
    assert payload["request_id"] == "req-abc"
    assert "timestamp" in payload
    assert "exception" not in payload


def test_json_formatter_includes_exception_traceback():
    try:
        raise ValueError("boom")
    except ValueError:
        import sys

        record = _make_record("failed", exc_info=sys.exc_info())
    record.request_id = None

    payload = json.loads(JsonFormatter().format(record))

    assert "ValueError: boom" in payload["exception"]
