"""Integration tests for PUT/DELETE /api/v1/users/{id} — admin update & soft delete."""
from uuid import UUID

import pytest
from sqlalchemy import select

from app.models.user import User, UserRole
from tests.conftest import TestSessionLocal

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
USERS_URL = "/api/v1/users"

ADMIN_PAYLOAD = {
    "first_name": "Yara",
    "last_name": "Nasr",
    "email": "yara.nasr@example.com",
    "phone_number": "+96170330011",
    "city": "Beirut",
    "age": 38,
    "password": "Password123",
}

TARGET_PAYLOAD = {
    "first_name": "Karim",
    "last_name": "Saad",
    "email": "karim.saad@example.com",
    "phone_number": "+96170330022",
    "city": "Tyre",
    "age": 29,
    "password": "Password123",
}

OTHER_PAYLOAD = {
    "first_name": "Lea",
    "last_name": "Mansour",
    "email": "lea.mansour@example.com",
    "phone_number": "+96170330033",
    "city": "Tyre",
    "age": 24,
    "password": "Password123",
}


async def _promote_to_admin(email: str) -> None:
    async with TestSessionLocal() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        user.type = UserRole.ADMIN
        await session.commit()


async def _get_id(email: str) -> str:
    async with TestSessionLocal() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        return str(user.id)


async def _login(client, payload: dict) -> str:
    response = await client.post(
        LOGIN_URL, json={"email": payload["email"], "password": payload["password"]}
    )
    return response.json()["access_token"]


async def _admin_token(client) -> str:
    await client.post(REGISTER_URL, json=ADMIN_PAYLOAD)
    await _promote_to_admin(ADMIN_PAYLOAD["email"])
    return await _login(client, ADMIN_PAYLOAD)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_admin_updates_user_fields(client):
    admin_token = await _admin_token(client)
    await client.post(REGISTER_URL, json=TARGET_PAYLOAD)
    target_id = await _get_id(TARGET_PAYLOAD["email"])

    response = await client.put(
        f"{USERS_URL}/{target_id}", json={"city": "Sidon", "age": 31}, headers=_auth(admin_token)
    )

    assert response.status_code == 200
    body = response.json()
    assert body["city"] == "Sidon"
    assert body["age"] == 31


@pytest.mark.asyncio
async def test_admin_promotes_client_to_admin(client):
    admin_token = await _admin_token(client)
    await client.post(REGISTER_URL, json=TARGET_PAYLOAD)
    target_id = await _get_id(TARGET_PAYLOAD["email"])

    response = await client.put(
        f"{USERS_URL}/{target_id}", json={"type": "admin"}, headers=_auth(admin_token)
    )

    assert response.status_code == 200
    assert response.json()["type"] == "admin"


@pytest.mark.asyncio
async def test_admin_demotes_admin_to_client(client):
    admin_token = await _admin_token(client)
    await client.post(REGISTER_URL, json=TARGET_PAYLOAD)
    await _promote_to_admin(TARGET_PAYLOAD["email"])
    target_id = await _get_id(TARGET_PAYLOAD["email"])

    response = await client.put(
        f"{USERS_URL}/{target_id}", json={"type": "client"}, headers=_auth(admin_token)
    )

    assert response.status_code == 200
    assert response.json()["type"] == "client"


@pytest.mark.asyncio
async def test_admin_update_rejects_duplicate_email(client):
    admin_token = await _admin_token(client)
    await client.post(REGISTER_URL, json=TARGET_PAYLOAD)
    await client.post(REGISTER_URL, json=OTHER_PAYLOAD)
    target_id = await _get_id(TARGET_PAYLOAD["email"])

    response = await client.put(
        f"{USERS_URL}/{target_id}",
        json={"email": OTHER_PAYLOAD["email"]},
        headers=_auth(admin_token),
    )

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_admin_update_nonexistent_user_returns_404(client):
    admin_token = await _admin_token(client)

    response = await client.put(
        f"{USERS_URL}/00000000-0000-0000-0000-000000000000",
        json={"city": "Sidon"},
        headers=_auth(admin_token),
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_client_cannot_update_another_user(client):
    await client.post(REGISTER_URL, json=TARGET_PAYLOAD)
    target_id = await _get_id(TARGET_PAYLOAD["email"])

    await client.post(REGISTER_URL, json=OTHER_PAYLOAD)
    client_token = await _login(client, OTHER_PAYLOAD)

    response = await client.put(
        f"{USERS_URL}/{target_id}", json={"city": "Sidon"}, headers=_auth(client_token)
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_soft_deletes_user(client):
    admin_token = await _admin_token(client)
    await client.post(REGISTER_URL, json=TARGET_PAYLOAD)
    target_id = await _get_id(TARGET_PAYLOAD["email"])

    response = await client.delete(f"{USERS_URL}/{target_id}", headers=_auth(admin_token))

    assert response.status_code == 200
    assert response.json()["is_deleted"] is True

    # The record still exists in the database — only marked, never removed.
    async with TestSessionLocal() as session:
        deleted_user = await session.get(User, UUID(target_id))
        assert deleted_user is not None
        assert deleted_user.is_deleted is True
        assert deleted_user.deleted_at is not None


@pytest.mark.asyncio
async def test_soft_deleted_user_disappears_from_listing_and_cannot_login(client):
    admin_token = await _admin_token(client)
    await client.post(REGISTER_URL, json=TARGET_PAYLOAD)
    target_id = await _get_id(TARGET_PAYLOAD["email"])

    await client.delete(f"{USERS_URL}/{target_id}", headers=_auth(admin_token))

    listing = await client.get(USERS_URL, headers=_auth(admin_token))
    emails = [u["email"] for u in listing.json()["users"]]
    assert TARGET_PAYLOAD["email"] not in emails

    login = await client.post(
        LOGIN_URL, json={"email": TARGET_PAYLOAD["email"], "password": TARGET_PAYLOAD["password"]}
    )
    assert login.status_code == 403


@pytest.mark.asyncio
async def test_delete_nonexistent_user_returns_404(client):
    admin_token = await _admin_token(client)

    response = await client.delete(
        f"{USERS_URL}/00000000-0000-0000-0000-000000000000", headers=_auth(admin_token)
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_client_cannot_delete_a_user(client):
    await client.post(REGISTER_URL, json=TARGET_PAYLOAD)
    target_id = await _get_id(TARGET_PAYLOAD["email"])

    await client.post(REGISTER_URL, json=OTHER_PAYLOAD)
    client_token = await _login(client, OTHER_PAYLOAD)

    response = await client.delete(f"{USERS_URL}/{target_id}", headers=_auth(client_token))

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_cannot_update_or_delete(client):
    await client.post(REGISTER_URL, json=TARGET_PAYLOAD)
    target_id = await _get_id(TARGET_PAYLOAD["email"])

    put_response = await client.put(f"{USERS_URL}/{target_id}", json={"city": "Sidon"})
    delete_response = await client.delete(f"{USERS_URL}/{target_id}")

    assert put_response.status_code == 401
    assert delete_response.status_code == 401
