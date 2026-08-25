"""Integration tests for the X-Request-ID response header."""

import uuid

import pytest

HEALTH_URL = "/health"


@pytest.mark.asyncio
async def test_response_carries_a_generated_request_id_when_none_supplied(client):
    response = await client.get(HEALTH_URL)

    assert response.status_code == 200
    request_id = response.headers.get("x-request-id")
    assert request_id is not None
    uuid.UUID(request_id)  # raises if it isn't a valid UUID


@pytest.mark.asyncio
async def test_response_echoes_back_a_caller_supplied_request_id(client):
    response = await client.get(HEALTH_URL, headers={"X-Request-ID": "caller-supplied-id"})

    assert response.status_code == 200
    assert response.headers.get("x-request-id") == "caller-supplied-id"


@pytest.mark.asyncio
async def test_each_request_gets_a_distinct_generated_request_id(client):
    first = await client.get(HEALTH_URL)
    second = await client.get(HEALTH_URL)

    assert first.headers["x-request-id"] != second.headers["x-request-id"]
