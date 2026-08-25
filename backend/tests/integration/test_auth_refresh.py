"""Integration tests for POST /api/v1/auth/refresh — refresh token rotation."""

import time

import pytest
from jose import jwt

from app.core.config import settings
from app.core.security import create_refresh_token

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
REFRESH_URL = "/api/v1/auth/refresh"
ME_URL = "/api/v1/users/me"

VALID_PAYLOAD = {
    "first_name": "Farah",
    "last_name": "Nassar",
    "email": "farah.nassar@example.com",
    "phone_number": "+96170770011",
    "city": "Byblos",
    "age": 28,
    "password": "Password123",
}


async def _register_and_login(client) -> dict:
    await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    response = await client.post(
        LOGIN_URL, json={"email": VALID_PAYLOAD["email"], "password": VALID_PAYLOAD["password"]}
    )
    return response.json()


@pytest.mark.asyncio
async def test_login_returns_both_tokens(client):
    tokens = await _register_and_login(client)

    assert tokens["token_type"] == "bearer"
    assert isinstance(tokens["access_token"], str) and tokens["access_token"]
    assert isinstance(tokens["refresh_token"], str) and tokens["refresh_token"]
    assert tokens["access_token"] != tokens["refresh_token"]


@pytest.mark.asyncio
async def test_refresh_issues_a_new_working_access_token(client):
    tokens = await _register_and_login(client)

    response = await client.post(REFRESH_URL, json={"refresh_token": tokens["refresh_token"]})

    assert response.status_code == 200
    new_tokens = response.json()
    # Refresh tokens carry a fresh jti every time, so always differ. Access
    # tokens carry no nonce, only sub/ver/iat/exp -- two issued within the
    # same wall-clock second (iat has 1s resolution) are legitimately
    # byte-identical, which is harmless (still stateless, still valid), so
    # that's not asserted here; what matters is that the new one works.
    assert new_tokens["refresh_token"] != tokens["refresh_token"]

    me = await client.get(ME_URL, headers={"Authorization": f"Bearer {new_tokens['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == VALID_PAYLOAD["email"]


@pytest.mark.asyncio
async def test_reusing_a_rotated_out_refresh_token_is_rejected_and_kills_all_sessions(client):
    """Rotation: the first refresh's *new* tokens are only valid until
    someone replays the *old* (now-superseded) refresh token -- at which
    point every session for the account is killed, including the one just
    issued by the legitimate rotation.
    """
    tokens = await _register_and_login(client)
    old_refresh = tokens["refresh_token"]

    first_refresh = await client.post(REFRESH_URL, json={"refresh_token": old_refresh})
    assert first_refresh.status_code == 200
    newest_tokens = first_refresh.json()

    # Replaying the old, already-rotated-out refresh token...
    replay = await client.post(REFRESH_URL, json={"refresh_token": old_refresh})
    assert replay.status_code == 401

    # ...kills the legitimately-rotated session too, not just the replay attempt.
    me = await client.get(
        ME_URL, headers={"Authorization": f"Bearer {newest_tokens['access_token']}"}
    )
    assert me.status_code == 401

    second_refresh = await client.post(
        REFRESH_URL, json={"refresh_token": newest_tokens["refresh_token"]}
    )
    assert second_refresh.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rejects_an_access_token(client):
    """An access token is a different credential -- it must not double as
    a refresh token just because it's a validly signed JWT.
    """
    tokens = await _register_and_login(client)

    response = await client.post(REFRESH_URL, json={"refresh_token": tokens["access_token"]})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rejects_malformed_token(client):
    response = await client.post(REFRESH_URL, json={"refresh_token": "not-a-real-token"})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rejects_expired_token(client):
    tokens = await _register_and_login(client)
    payload = jwt.decode(
        tokens["refresh_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
    )
    expired = jwt.encode(
        {
            "sub": payload["sub"],
            "ver": payload["ver"],
            "type": "refresh",
            "jti": payload["jti"],
            "exp": int(time.time()) - 60,
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    response = await client.post(REFRESH_URL, json={"refresh_token": expired})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rejects_a_forged_token_with_wrong_jti(client):
    """A well-formed, correctly signed, unexpired refresh token for a real
    user, but with a jti that was never actually issued to them -- the same
    "jti doesn't match current_refresh_token_id" check that catches replay
    of a legitimately-rotated-out token also catches an outright forgery.
    """
    tokens = await _register_and_login(client)
    real_subject = jwt.decode(
        tokens["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
    )["sub"]

    forged = create_refresh_token(subject=real_subject, token_version=1, jti="never-issued")

    response = await client.post(REFRESH_URL, json={"refresh_token": forged})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rejects_forged_token_for_user_who_never_logged_in(client):
    """Registering doesn't log you in or issue any tokens -- this user's
    current_refresh_token_id is NULL, a genuinely different case from a
    mismatched-but-present value (the two are separate branches of the
    same `or` check in auth_service.refresh_tokens).
    """
    register_response = await client.post(REGISTER_URL, json=VALID_PAYLOAD)
    user_id = register_response.json()["id"]

    forged = create_refresh_token(subject=user_id, token_version=1, jti="never-issued")

    response = await client.post(REFRESH_URL, json={"refresh_token": forged})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rejects_token_for_nonexistent_user(client):
    forged = create_refresh_token(
        subject="00000000-0000-0000-0000-000000000000", token_version=1, jti="x"
    )
    response = await client.post(REFRESH_URL, json={"refresh_token": forged})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_password_change_invalidates_existing_refresh_token(client):
    tokens = await _register_and_login(client)

    update = await client.put(
        ME_URL,
        json={"password": "BrandNewPassword456"},
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert update.status_code == 200

    response = await client.post(REFRESH_URL, json={"refresh_token": tokens["refresh_token"]})
    assert response.status_code == 401
