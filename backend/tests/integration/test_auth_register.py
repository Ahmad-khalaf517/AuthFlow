"""Integration tests for POST /api/v1/auth/register."""

import pytest

REGISTER_URL = "/api/v1/auth/register"

VALID_PAYLOAD = {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone_number": "+96170123456",
    "city": "Tripoli",
    "age": 25,
    "password": "Password123",
}


@pytest.mark.asyncio
async def test_register_creates_client_user(client):
    response = await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "client"
    assert body["email"] == VALID_PAYLOAD["email"]
    assert "password" not in body
    assert "hashed_password" not in body


@pytest.mark.asyncio
async def test_register_ignores_client_supplied_type(client):
    payload = {**VALID_PAYLOAD, "type": "admin"}
    response = await client.post(REGISTER_URL, json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_rejects_duplicate_email(client):
    first = await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    assert first.status_code == 201

    second = await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_register_rejects_invalid_phone(client):
    payload = {**VALID_PAYLOAD, "email": "other@example.com", "phone_number": "not-a-phone"}
    response = await client.post(REGISTER_URL, json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_rejects_weak_password(client):
    payload = {**VALID_PAYLOAD, "email": "weak@example.com", "password": "alllowercase"}
    response = await client.post(REGISTER_URL, json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_rejects_missing_required_field(client):
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "city"}
    response = await client.post(REGISTER_URL, json=payload)
    assert response.status_code == 422
