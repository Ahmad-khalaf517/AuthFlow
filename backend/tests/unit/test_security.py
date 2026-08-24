"""Unit tests for password hashing and JWT helpers."""
from jose import jwt

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password


def test_password_hash_round_trips():
    hashed = get_password_hash("Password123")
    assert hashed != "Password123"
    assert verify_password("Password123", hashed)


def test_wrong_password_fails_verification():
    hashed = get_password_hash("Password123")
    assert not verify_password("SomethingElse123", hashed)


def test_access_token_carries_subject_and_expiry():
    token = create_access_token(subject="user-123")
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "user-123"
    assert "exp" in payload
