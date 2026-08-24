"""Unit tests for password hashing and JWT helpers."""
import time

import pytest
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError

from app.core.config import settings
from app.core.security import create_access_token, decode_token, get_password_hash, verify_password


@pytest.mark.asyncio
async def test_password_hash_round_trips():
    hashed = await get_password_hash("Password123")
    assert hashed != "Password123"
    assert await verify_password("Password123", hashed)


@pytest.mark.asyncio
async def test_wrong_password_fails_verification():
    hashed = await get_password_hash("Password123")
    assert not await verify_password("SomethingElse123", hashed)


def test_access_token_carries_subject_version_and_expiry():
    token = create_access_token(subject="user-123", token_version=1)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "user-123"
    assert payload["ver"] == 1
    assert "iat" in payload
    assert "exp" in payload


def test_decode_token_round_trips():
    token = create_access_token(subject="user-123", token_version=2)
    result = decode_token(token)
    assert result.subject == "user-123"
    assert result.token_version == 2


def test_decode_token_rejects_expired():
    expired = jwt.encode(
        {"sub": "user-123", "ver": 1, "exp": int(time.time()) - 60},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    with pytest.raises(ExpiredSignatureError):
        decode_token(expired)


def test_decode_token_rejects_bad_signature():
    token = jwt.encode(
        {"sub": "user-123", "ver": 1, "exp": int(time.time()) + 3600},
        "wrong-secret",
        algorithm=settings.ALGORITHM,
    )
    with pytest.raises(JWTError):
        decode_token(token)


def test_decode_token_rejects_missing_version_claim():
    token = jwt.encode(
        {"sub": "user-123", "exp": int(time.time()) + 3600}, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    with pytest.raises(JWTError):
        decode_token(token)
