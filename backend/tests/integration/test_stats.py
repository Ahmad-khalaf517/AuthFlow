"""Integration tests for the public /api/v1/stats/* endpoints."""

import pytest
from sqlalchemy import select

from app.models.user import User
from tests.conftest import TestSessionLocal

REGISTER_URL = "/api/v1/auth/register"
COUNT_URL = "/api/v1/stats/count"
AVG_AGE_URL = "/api/v1/stats/average-age"
TOP_CITIES_URL = "/api/v1/stats/top-cities"

USERS = [
    {
        "first_name": "A",
        "last_name": "One",
        "email": "stats.a@example.com",
        "phone_number": "+96170440001",
        "city": "Tripoli",
        "age": 20,
        "password": "Password123",
    },
    {
        "first_name": "B",
        "last_name": "Two",
        "email": "stats.b@example.com",
        "phone_number": "+96170440002",
        "city": "Tripoli",
        "age": 30,
        "password": "Password123",
    },
    {
        "first_name": "C",
        "last_name": "Three",
        "email": "stats.c@example.com",
        "phone_number": "+96170440003",
        "city": "Beirut",
        "age": 40,
        "password": "Password123",
    },
    {
        "first_name": "D",
        "last_name": "Four",
        "email": "stats.d@example.com",
        "phone_number": "+96170440004",
        "city": "Saida",
        "age": 50,
        "password": "Password123",
    },
    {
        "first_name": "E",
        "last_name": "Five",
        "email": "stats.e@example.com",
        "phone_number": "+96170440005",
        "city": "Jbeil",
        "age": 60,
        "password": "Password123",
    },
]


async def _seed(client) -> None:
    for payload in USERS:
        await client.post(REGISTER_URL, json=payload)


async def _soft_delete(email: str) -> None:
    async with TestSessionLocal() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        user.is_deleted = True
        await session.commit()


@pytest.mark.asyncio
async def test_stats_endpoints_require_no_authentication(client):
    # No Authorization header on any of these — they must still succeed.
    assert (await client.get(COUNT_URL)).status_code == 200
    assert (await client.get(AVG_AGE_URL)).status_code == 200
    assert (await client.get(TOP_CITIES_URL)).status_code == 200


@pytest.mark.asyncio
async def test_count_with_no_users(client):
    response = await client.get(COUNT_URL)
    assert response.status_code == 200
    assert response.json() == {"total_users": 0}


@pytest.mark.asyncio
async def test_count_reflects_active_users_only(client):
    await _seed(client)
    await _soft_delete(USERS[0]["email"])

    response = await client.get(COUNT_URL)

    assert response.status_code == 200
    assert response.json()["total_users"] == len(USERS) - 1


@pytest.mark.asyncio
async def test_average_age_with_no_users_is_zero(client):
    response = await client.get(AVG_AGE_URL)
    assert response.status_code == 200
    assert response.json()["average_age"] == 0.0


@pytest.mark.asyncio
async def test_average_age_excludes_soft_deleted(client):
    await _seed(client)  # ages: 20, 30, 40, 50, 60 -> avg 40
    await _soft_delete(USERS[4]["email"])  # remove the 60 -> avg of 20,30,40,50 = 35

    response = await client.get(AVG_AGE_URL)

    assert response.status_code == 200
    assert response.json()["average_age"] == 35.0


@pytest.mark.asyncio
async def test_top_cities_with_no_users(client):
    response = await client.get(TOP_CITIES_URL)
    assert response.status_code == 200
    assert response.json() == {"cities": []}


@pytest.mark.asyncio
async def test_top_cities_ranks_by_count_and_excludes_soft_deleted(client):
    await _seed(client)  # Tripoli x2, Beirut x1, Saida x1, Jbeil x1
    await _soft_delete(USERS[1]["email"])  # drop one Tripoli -> all cities tied at 1

    response = await client.get(TOP_CITIES_URL)

    assert response.status_code == 200
    cities = response.json()["cities"]
    assert len(cities) == 3  # top 3 only
    assert all(c["count"] == 1 for c in cities)


@pytest.mark.asyncio
async def test_top_cities_orders_most_common_first(client):
    await _seed(client)  # Tripoli has 2, everyone else has 1

    response = await client.get(TOP_CITIES_URL)

    cities = response.json()["cities"]
    assert cities[0] == {"city": "Tripoli", "count": 2}
