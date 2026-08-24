"""Password hashing and JWT helpers."""
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import jwt
from jose.exceptions import JWTError

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


def decode_token(token: str) -> str:
    """Decode a JWT and return its subject (user id).

    Raises jose.JWTError (ExpiredSignatureError / JWTClaimsError included,
    both subclass it) on any invalid, expired, or malformed token — callers
    translate that into a 401.
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    subject = payload.get("sub")
    if subject is None:
        raise JWTError("Token is missing a subject claim")
    return subject
