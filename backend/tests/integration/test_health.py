"""Smoke test verifying the app boots and the health endpoint responds."""

import pytest

from app.api.deps import get_db
from app.main import app


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


class _BrokenSession:
    """Stands in for a session whose connection died mid-query -- the
    realistic failure mode: get_db() itself succeeds (it's just a lazy
    Session object, no I/O yet), the query against it is what fails.
    """

    async def execute(self, *args, **kwargs):
        raise ConnectionError("simulated database outage")


@pytest.mark.asyncio
async def test_health_check_reports_503_when_db_unreachable(client):
    async def _broken_get_db():
        yield _BrokenSession()

    app.dependency_overrides[get_db] = _broken_get_db
    try:
        response = await client.get("/health")
    finally:
        # Restore the real (test-DB-backed) override from conftest.py --
        # otherwise every test after this one would see the broken version.
        from tests.conftest import _override_get_db

        app.dependency_overrides[get_db] = _override_get_db

    assert response.status_code == 503
