"""Integration tests for POST /api/v1/auth/login."""
import pytest
from sqlalchemy import select

from app.models.user import User
from tests.conftest import TestSessionLocal

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"

VALID_PAYLOAD = {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone_number": "+96170123456",
    "city": "Tripoli",
    "age": 25,
    "password": "Password123",
}


async def _soft_delete(email: str) -> None:
    async with TestSessionLocal() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        user.is_deleted = True
        await session.commit()


@pytest.mark.asyncio
async def test_login_returns_access_token(client):
    await client.post(REGISTER_URL, json=VALID_PAYLOAD)

    response = await client.post(
        LOGIN_URL, json={"email": VALID_PAYLOAD["email"], "password": VALID_PAYLOAD["password"]}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]


@pytest.mark.asyncio
async def test_login_rejects_unknown_email(client):
    response = await client.post(
        LOGIN_URL, json={"email": "nobody@example.com", "password": "Password123"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_rejects_wrong_password(client):
    await client.post(REGISTER_URL, json=VALID_PAYLOAD)

    response = await client.post(
        LOGIN_URL, json={"email": VALID_PAYLOAD["email"], "password": "WrongPassword123"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_rejects_soft_deleted_account(client):
    await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    await _soft_delete(VALID_PAYLOAD["email"])

    response = await client.post(
        LOGIN_URL, json={"email": VALID_PAYLOAD["email"], "password": VALID_PAYLOAD["password"]}
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_login_rejects_missing_password(client):
    response = await client.post(LOGIN_URL, json={"email": VALID_PAYLOAD["email"]})
    assert response.status_code == 422
