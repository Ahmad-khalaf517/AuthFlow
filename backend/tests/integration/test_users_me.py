"""Integration tests for GET /api/v1/users/me — the get_current_user dependency."""
import time
import uuid

import pytest
from jose import jwt
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User
from tests.conftest import TestSessionLocal

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
ME_URL = "/api/v1/users/me"

VALID_PAYLOAD = {
    "first_name": "Nora",
    "last_name": "Saleh",
    "email": "nora.saleh@example.com",
    "phone_number": "+96170665544",
    "city": "Byblos",
    "age": 31,
    "password": "Password123",
}


async def _register_and_login(client) -> str:
    await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    response = await client.post(
        LOGIN_URL, json={"email": VALID_PAYLOAD["email"], "password": VALID_PAYLOAD["password"]}
    )
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_me_returns_current_user(client):
    token = await _register_and_login(client)

    response = await client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == VALID_PAYLOAD["email"]
    assert body["type"] == "client"


@pytest.mark.asyncio
async def test_me_rejects_missing_token(client):
    response = await client.get(ME_URL)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_rejects_malformed_token(client):
    response = await client.get(ME_URL, headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_rejects_expired_token(client):
    token = await _register_and_login(client)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    expired = jwt.encode(
        {"sub": payload["sub"], "exp": int(time.time()) - 60},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    response = await client.get(ME_URL, headers={"Authorization": f"Bearer {expired}"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_rejects_token_for_nonexistent_user(client):
    """A well-formed, correctly signed, unexpired token whose subject
    doesn't match any real user (e.g. a hard-deleted account) -- distinct
    from the soft-deleted case below, which does find a user row.
    """
    token = create_access_token(subject=str(uuid.uuid4()), token_version=1)

    response = await client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_rejects_token_for_deleted_account(client):
    """A token stays cryptographically valid after the account is deleted —
    the dependency must re-check the DB rather than trust the token alone.
    """
    token = await _register_and_login(client)

    async with TestSessionLocal() as session:
        user = (
            await session.execute(select(User).where(User.email == VALID_PAYLOAD["email"]))
        ).scalar_one()
        user.is_deleted = True
        await session.commit()

    response = await client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
