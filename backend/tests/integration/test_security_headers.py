"""Integration tests for the security-headers middleware."""

import pytest

HEALTH_URL = "/health"


@pytest.mark.asyncio
async def test_response_carries_standard_security_headers(client):
    response = await client.get(HEALTH_URL)

    assert response.status_code == 200
    headers = response.headers
    assert headers["strict-transport-security"] == "max-age=63072000; includeSubDomains"
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["x-frame-options"] == "DENY"
    assert headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert headers["permissions-policy"] == "geolocation=(), camera=(), microphone=(), payment=()"
    assert headers["x-xss-protection"] == "0"


@pytest.mark.asyncio
async def test_security_headers_present_on_error_responses_too(client):
    response = await client.get("/api/v1/users/me")  # unauthenticated -> 401

    assert response.status_code == 401
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
