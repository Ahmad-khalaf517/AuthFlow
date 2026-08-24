"""Password hashing and JWT helpers.

decode_token (for the get_current_user dependency) lands with route guards.
"""
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import jwt

from app.core.config import settings

_hasher = PasswordHasher()


def get_password_hash(password: str) -> str:
    return _hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return _hasher.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False


def create_access_token(subject: str) -> str:
    """subject is the user's id, not their role — a fresh role/soft-delete
    check happens against the DB on every request that decodes this token,
    rather than trusting a role baked in at login time.
    """
    expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
