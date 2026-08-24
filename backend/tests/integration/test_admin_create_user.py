"""Integration tests for POST /api/v1/users — admin-only user creation."""
import pytest
from sqlalchemy import select

from app.models.user import User, UserRole
from tests.conftest import TestSessionLocal

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
USERS_URL = "/api/v1/users"

ADMIN_PAYLOAD = {
    "first_name": "Rita",
    "last_name": "Admin",
    "email": "rita.admin@example.com",
    "phone_number": "+96170112200",
    "city": "Beirut",
    "age": 35,
    "password": "Password123",
}

CLIENT_PAYLOAD = {
    "first_name": "Cara",
    "last_name": "Client",
    "email": "cara.client@example.com",
    "phone_number": "+96170112201",
    "city": "Beirut",
    "age": 26,
    "password": "Password123",
}

NEW_USER_PAYLOAD = {
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.new@example.com",
    "phone_number": "+96170123456",
    "city": "Beirut",
    "age": 30,
    "type": "admin",
    "password": "SecurePassword123",
}


async def _promote_to_admin(email: str) -> None:
    async with TestSessionLocal() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        user.type = UserRole.ADMIN
        await session.commit()


async def _register_and_login(client, payload: dict) -> str:
    await client.post(REGISTER_URL, json=payload)
    response = await client.post(
        LOGIN_URL, json={"email": payload["email"], "password": payload["password"]}
    )
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_admin_can_create_admin_user(client):
    token = await _register_and_login(client, ADMIN_PAYLOAD)
    await _promote_to_admin(ADMIN_PAYLOAD["email"])

    response = await client.post(
        USERS_URL, json=NEW_USER_PAYLOAD, headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "admin"
    assert body["email"] == NEW_USER_PAYLOAD["email"]
    assert "password" not in body
    assert "hashed_password" not in body


@pytest.mark.asyncio
async def test_admin_can_create_client_user(client):
    token = await _register_and_login(client, ADMIN_PAYLOAD)
    await _promote_to_admin(ADMIN_PAYLOAD["email"])

    payload = {**NEW_USER_PAYLOAD, "email": "other.new@example.com", "type": "client"}
    response = await client.post(
        USERS_URL, json=payload, headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 201
    assert response.json()["type"] == "client"


@pytest.mark.asyncio
async def test_client_forbidden_from_creating_users(client):
    token = await _register_and_login(client, CLIENT_PAYLOAD)

    response = await client.post(
        USERS_URL, json=NEW_USER_PAYLOAD, headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(client):
    response = await client.post(USERS_URL, json=NEW_USER_PAYLOAD)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_create_rejects_duplicate_email(client):
    token = await _register_and_login(client, ADMIN_PAYLOAD)
    await _promote_to_admin(ADMIN_PAYLOAD["email"])

    payload = {**NEW_USER_PAYLOAD, "email": ADMIN_PAYLOAD["email"]}
    response = await client.post(
        USERS_URL, json=payload, headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_admin_create_requires_type_field(client):
    token = await _register_and_login(client, ADMIN_PAYLOAD)
    await _promote_to_admin(ADMIN_PAYLOAD["email"])

    payload = {k: v for k, v in NEW_USER_PAYLOAD.items() if k != "type"}
    response = await client.post(
        USERS_URL, json=payload, headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 422
