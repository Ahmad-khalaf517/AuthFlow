"""Password hashing and JWT helpers."""
import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import jwt
from jose.exceptions import JWTError

from app.core.config import settings


@dataclass(frozen=True)
class TokenPayload:
    subject: str
    token_version: int
    token_type: str  # "access" | "refresh"
    jti: str | None  # only set on refresh tokens


_hasher = PasswordHasher()


def _hash_password_sync(password: str) -> str:
    return _hasher.hash(password)


def _verify_password_sync(plain_password: str, hashed_password: str) -> bool:
    try:
        return _hasher.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False


async def get_password_hash(password: str) -> str:
    """Argon2 is deliberately CPU-expensive (that's what makes it resistant
    to brute-forcing) — tens of milliseconds per call. Called directly from
    an async def, that would block the single-threaded event loop for the
    duration, stalling every other in-flight request on this worker. Runs
    in a thread instead so the loop stays free.
    """
    return await asyncio.to_thread(_hash_password_sync, password)


async def verify_password(plain_password: str, hashed_password: str) -> bool:
    return await asyncio.to_thread(_verify_password_sync, plain_password, hashed_password)


def create_access_token(subject: str, token_version: int) -> str:
    """subject is the user's id, not their role — a fresh role/soft-delete
    check happens against the DB on every request that decodes this token,
    rather than trusting a role baked in at login time.

    token_version is compared against the user's current token_version in
    get_current_user: changing your password bumps the column, which
    immediately invalidates every token issued before the change (including
    a stolen one) rather than leaving them valid until natural expiry.
    """
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "ver": token_version,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: str, token_version: int, jti: str) -> str:
    """jti identifies this specific refresh token so the server can tell a
    legitimate reuse (the current one) from a replay of one already rotated
    out (see auth_service.refresh_tokens) — an access token doesn't need
    this, since it's never rotated, only checked against token_version.
    """
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "ver": token_version,
        "type": "refresh",
        "jti": jti,
        "iat": now,
        "exp": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> TokenPayload:
    """Decode a JWT and return its subject, token_version, type, and (for
    refresh tokens) jti. Doesn't check the type is what the caller expects
    — that's the caller's job (get_current_user requires "access",
    auth_service.refresh_tokens requires "refresh"), so a refresh token can
    never be handed to decode_token and come out usable as an access token.

    Raises jose.JWTError (ExpiredSignatureError / JWTClaimsError included,
    both subclass it) on any invalid, expired, or malformed token — callers
    translate that into a 401.
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    subject = payload.get("sub")
    token_version = payload.get("ver")
    token_type = payload.get("type")
    if subject is None or token_version is None or token_type is None:
        raise JWTError("Token is missing required claims")
    return TokenPayload(
        subject=subject, token_version=token_version, token_type=token_type, jti=payload.get("jti")
    )
