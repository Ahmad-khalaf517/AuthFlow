"""Integration tests for the require_role authorization dependency.

No admin-only production endpoint exists yet, so this mounts a throwaway
route directly on the app to exercise require_role() in isolation.
"""
import pytest
from fastapi import Depends
from sqlalchemy import select

from app.api.deps import require_role
from app.main import app
from app.models.user import User, UserRole
from tests.conftest import TestSessionLocal

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
ADMIN_ONLY_URL = "/api/v1/_test/admin-only"

VALID_PAYLOAD = {
    "first_name": "Sam",
    "last_name": "Client",
    "email": "sam.client@example.com",
    "phone_number": "+96170554433",
    "city": "Beirut",
    "age": 29,
    "password": "Password123",
}


@app.get(ADMIN_ONLY_URL)
async def _admin_only_route(user: User = Depends(require_role(UserRole.ADMIN))):
    return {"ok": True}


async def _promote_to_admin(email: str) -> None:
    async with TestSessionLocal() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        user.type = UserRole.ADMIN
        await session.commit()


async def _register_and_login(client) -> str:
    await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    response = await client.post(
        LOGIN_URL, json={"email": VALID_PAYLOAD["email"], "password": VALID_PAYLOAD["password"]}
    )
    return response.json()["access_token"]


@pytest.mark.asyncio
async def test_require_role_denies_wrong_role(client):
    token = await _register_and_login(client)

    response = await client.get(ADMIN_ONLY_URL, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_require_role_allows_matching_role(client):
    token = await _register_and_login(client)
    await _promote_to_admin(VALID_PAYLOAD["email"])

    response = await client.get(ADMIN_ONLY_URL, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json() == {"ok": True}


@pytest.mark.asyncio
async def test_require_role_still_requires_authentication(client):
    response = await client.get(ADMIN_ONLY_URL)
    assert response.status_code == 401
