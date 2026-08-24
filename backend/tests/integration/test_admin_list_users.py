"""Integration tests for GET /api/v1/users — admin-only pagination + filtering."""
import pytest
from sqlalchemy import select

from app.models.user import User, UserRole
from tests.conftest import TestSessionLocal

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
USERS_URL = "/api/v1/users"

ADMIN_PAYLOAD = {
    "first_name": "Nadine",
    "last_name": "Karam",
    "email": "nadine.karam@example.com",
    "phone_number": "+96170220011",
    "city": "Beirut",
    "age": 40,
    "password": "Password123",
}

# A spread of users to filter/paginate over.
OTHER_USERS = [
    {"first_name": "John", "last_name": "Doe", "email": "john.doe.list@example.com",
     "phone_number": "+96170220001", "city": "Tripoli", "age": 25, "password": "Password123"},
    {"first_name": "Johnny", "last_name": "Smith", "email": "johnny.smith.list@example.com",
     "phone_number": "+96170220002", "city": "Tripoli", "age": 30, "password": "Password123"},
    {"first_name": "Mona", "last_name": "Zein", "email": "mona.zein.list@example.com",
     "phone_number": "+96170220003", "city": "Saida", "age": 25, "password": "Password123"},
    {"first_name": "Tarek", "last_name": "Hage", "email": "tarek.hage.list@example.com",
     "phone_number": "+96170220004", "city": "Beirut", "age": 50, "password": "Password123"},
]


async def _promote_to_admin(email: str) -> None:
    async with TestSessionLocal() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        user.type = UserRole.ADMIN
        await session.commit()


async def _admin_token(client) -> str:
    await client.post(REGISTER_URL, json=ADMIN_PAYLOAD)
    await _promote_to_admin(ADMIN_PAYLOAD["email"])
    response = await client.post(
        LOGIN_URL, json={"email": ADMIN_PAYLOAD["email"], "password": ADMIN_PAYLOAD["password"]}
    )
    return response.json()["access_token"]


async def _seed_other_users(client) -> None:
    for payload in OTHER_USERS:
        await client.post(REGISTER_URL, json=payload)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_client_cannot_list_users(client):
    await client.post(REGISTER_URL, json=OTHER_USERS[0])
    login = await client.post(
        LOGIN_URL,
        json={"email": OTHER_USERS[0]["email"], "password": OTHER_USERS[0]["password"]},
    )
    token = login.json()["access_token"]

    response = await client.get(USERS_URL, headers=_auth(token))
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_cannot_list_users(client):
    response = await client.get(USERS_URL)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_lists_all_active_users(client):
    token = await _admin_token(client)
    await _seed_other_users(client)

    response = await client.get(USERS_URL, headers=_auth(token))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 5  # 4 seeded + the admin themself
    assert len(body["users"]) == 5
    assert body["page"] == 1
    assert body["limit"] == 10
    assert body["total_pages"] == 1


@pytest.mark.asyncio
async def test_pagination_splits_results_correctly(client):
    token = await _admin_token(client)
    await _seed_other_users(client)

    page1 = await client.get(USERS_URL, params={"page": 1, "limit": 2}, headers=_auth(token))
    page2 = await client.get(USERS_URL, params={"page": 2, "limit": 2}, headers=_auth(token))
    page3 = await client.get(USERS_URL, params={"page": 3, "limit": 2}, headers=_auth(token))

    assert page1.json()["total"] == 5
    assert page1.json()["total_pages"] == 3
    assert len(page1.json()["users"]) == 2
    assert len(page2.json()["users"]) == 2
    assert len(page3.json()["users"]) == 1

    ids_seen = {u["id"] for u in page1.json()["users"]}
    ids_seen |= {u["id"] for u in page2.json()["users"]}
    ids_seen |= {u["id"] for u in page3.json()["users"]}
    assert len(ids_seen) == 5  # no overlap, no gaps


@pytest.mark.asyncio
async def test_page_below_one_rejected(client):
    token = await _admin_token(client)
    response = await client.get(USERS_URL, params={"page": 0}, headers=_auth(token))
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_limit_above_max_rejected(client):
    token = await _admin_token(client)
    response = await client.get(USERS_URL, params={"limit": 101}, headers=_auth(token))
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_filter_by_city_exact(client):
    token = await _admin_token(client)
    await _seed_other_users(client)

    response = await client.get(USERS_URL, params={"city": "Tripoli"}, headers=_auth(token))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert all(u["city"] == "Tripoli" for u in body["users"])


@pytest.mark.asyncio
async def test_filter_by_type(client):
    token = await _admin_token(client)
    await _seed_other_users(client)

    response = await client.get(USERS_URL, params={"type": "admin"}, headers=_auth(token))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["users"][0]["email"] == ADMIN_PAYLOAD["email"]


@pytest.mark.asyncio
async def test_filter_by_age(client):
    token = await _admin_token(client)
    await _seed_other_users(client)

    response = await client.get(USERS_URL, params={"age": 25}, headers=_auth(token))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert all(u["age"] == 25 for u in body["users"])


@pytest.mark.asyncio
async def test_filter_by_first_name_is_partial_and_case_insensitive(client):
    token = await _admin_token(client)
    await _seed_other_users(client)

    response = await client.get(USERS_URL, params={"first_name": "john"}, headers=_auth(token))

    assert response.status_code == 200
    body = response.json()
    # Matches both "John" and "Johnny".
    assert body["total"] == 2


@pytest.mark.asyncio
async def test_combined_filters(client):
    token = await _admin_token(client)
    await _seed_other_users(client)

    response = await client.get(
        USERS_URL, params={"city": "Tripoli", "type": "client"}, headers=_auth(token)
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert all(u["city"] == "Tripoli" and u["type"] == "client" for u in body["users"])


@pytest.mark.asyncio
async def test_filters_combined_with_pagination(client):
    token = await _admin_token(client)
    await _seed_other_users(client)

    response = await client.get(
        USERS_URL, params={"city": "Tripoli", "type": "client", "page": 1, "limit": 1}, headers=_auth(token)
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["total_pages"] == 2
    assert len(body["users"]) == 1


@pytest.mark.asyncio
async def test_soft_deleted_user_excluded_from_listing(client):
    token = await _admin_token(client)
    await client.post(REGISTER_URL, json=OTHER_USERS[0])

    async with TestSessionLocal() as session:
        user = (
            await session.execute(select(User).where(User.email == OTHER_USERS[0]["email"]))
        ).scalar_one()
        user.is_deleted = True
        await session.commit()

    response = await client.get(USERS_URL, headers=_auth(token))

    assert response.status_code == 200
    emails = [u["email"] for u in response.json()["users"]]
    assert OTHER_USERS[0]["email"] not in emails
