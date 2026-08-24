"""Integration tests for PUT /api/v1/users/me — self-service profile update."""
import pytest

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
ME_URL = "/api/v1/users/me"

USER_A = {
    "first_name": "Dana",
    "last_name": "Aoun",
    "email": "dana.aoun@example.com",
    "phone_number": "+96170881122",
    "city": "Jounieh",
    "age": 27,
    "password": "Password123",
}

USER_B = {
    "first_name": "Elie",
    "last_name": "Fadel",
    "email": "elie.fadel@example.com",
    "phone_number": "+96170881133",
    "city": "Jounieh",
    "age": 33,
    "password": "Password123",
}


async def _register_and_login(client, payload: dict) -> str:
    await client.post(REGISTER_URL, json=payload)
    response = await client.post(
        LOGIN_URL, json={"email": payload["email"], "password": payload["password"]}
    )
    return response.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_update_own_profile_fields(client):
    token = await _register_and_login(client, USER_A)

    response = await client.put(
        ME_URL, json={"city": "Batroun", "age": 28}, headers=_auth(token)
    )

    assert response.status_code == 200
    body = response.json()
    assert body["city"] == "Batroun"
    assert body["age"] == 28
    # Untouched fields survive the partial update.
    assert body["first_name"] == USER_A["first_name"]
    assert body["email"] == USER_A["email"]


@pytest.mark.asyncio
async def test_update_own_password_then_login_with_new_password(client):
    token = await _register_and_login(client, USER_A)

    update = await client.put(ME_URL, json={"password": "NewPassword456"}, headers=_auth(token))
    assert update.status_code == 200

    old_login = await client.post(
        LOGIN_URL, json={"email": USER_A["email"], "password": USER_A["password"]}
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        LOGIN_URL, json={"email": USER_A["email"], "password": "NewPassword456"}
    )
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_changing_own_password_invalidates_the_old_token(client):
    """A token stays cryptographically valid (unexpired, correctly signed)
    after a password change -- this proves the app still rejects it anyway,
    via the token_version check, rather than relying on natural expiry.
    """
    old_token = await _register_and_login(client, USER_A)

    update = await client.put(
        ME_URL, json={"password": "NewPassword456"}, headers=_auth(old_token)
    )
    assert update.status_code == 200

    stale_request = await client.get(ME_URL, headers=_auth(old_token))
    assert stale_request.status_code == 401

    new_login = await client.post(
        LOGIN_URL, json={"email": USER_A["email"], "password": "NewPassword456"}
    )
    fresh_token = new_login.json()["access_token"]
    fresh_request = await client.get(ME_URL, headers=_auth(fresh_token))
    assert fresh_request.status_code == 200


@pytest.mark.asyncio
async def test_non_password_update_does_not_invalidate_existing_token(client):
    token = await _register_and_login(client, USER_A)

    update = await client.put(ME_URL, json={"city": "Batroun"}, headers=_auth(token))
    assert update.status_code == 200

    still_valid = await client.get(ME_URL, headers=_auth(token))
    assert still_valid.status_code == 200


@pytest.mark.asyncio
async def test_cannot_change_own_role(client):
    token = await _register_and_login(client, USER_A)

    response = await client.put(ME_URL, json={"type": "admin"}, headers=_auth(token))

    assert response.status_code == 422
    me = await client.get(ME_URL, headers=_auth(token))
    assert me.json()["type"] == "client"


@pytest.mark.asyncio
async def test_update_rejects_duplicate_email(client):
    await client.post(REGISTER_URL, json=USER_B)
    token = await _register_and_login(client, USER_A)

    response = await client.put(ME_URL, json={"email": USER_B["email"]}, headers=_auth(token))

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_update_allows_resubmitting_own_unchanged_email(client):
    token = await _register_and_login(client, USER_A)

    response = await client.put(ME_URL, json={"email": USER_A["email"]}, headers=_auth(token))

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_rejects_invalid_data(client):
    token = await _register_and_login(client, USER_A)

    response = await client.put(ME_URL, json={"phone_number": "not-a-phone"}, headers=_auth(token))

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_requires_authentication(client):
    response = await client.put(ME_URL, json={"city": "Batroun"})
    assert response.status_code == 401
