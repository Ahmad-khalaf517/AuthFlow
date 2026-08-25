"""Integration tests for the global exception handlers.

No route in the real API raises a bare, unhandled exception on purpose --
this mounts a throwaway route (test-file-only; never touches the real app
when run via uvicorn) specifically to exercise the catch-all handler.
"""

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app

BROKEN_URL = "/api/v1/_test/broken"


@app.get(BROKEN_URL)
async def _broken_route():
    raise RuntimeError("boom")


@pytest_asyncio.fixture
async def lenient_client() -> AsyncGenerator[AsyncClient, None]:
    """Starlette's ServerErrorMiddleware sends the handled response over
    the ASGI protocol, then deliberately re-raises the original exception
    (so servers/loggers still see it as a crash even though a response was
    already sent) -- httpx.ASGITransport's default raise_app_exceptions=True
    propagates that re-raise into the test instead of returning the response,
    which is right for the shared `client` fixture (a genuinely-unexpected
    exception in some other test should fail loudly, not silently become a
    500). This test file's whole point is exercising that fallback path, so
    it needs raise_app_exceptions=False to see what a real HTTP client would.
    """
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_unhandled_exception_returns_consistent_json_shape(lenient_client):
    response = await lenient_client.get(BROKEN_URL)

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}


@pytest.mark.asyncio
async def test_unhandled_exception_does_not_leak_internals(lenient_client):
    response = await lenient_client.get(BROKEN_URL)

    # The real exception message/type must never reach the client.
    assert "boom" not in response.text
    assert "RuntimeError" not in response.text
