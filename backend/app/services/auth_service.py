"""Authentication business logic."""

import uuid

from jose.exceptions import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AccountDeactivatedError,
    DuplicateEmailError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.crud import user as user_crud
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserCreate


async def register_user(db: AsyncSession, user_in: UserCreate) -> User:
    """Public registration. Role is always forced to `client` here — the
    incoming schema has no `type` field, so there's nothing to trust even if
    a caller tried to smuggle one in.
    """
    if await user_crud.get_by_email(db, user_in.email) is not None:
        raise DuplicateEmailError()

    return await user_crud.create(
        db,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        email=user_in.email,
        phone_number=user_in.phone_number,
        city=user_in.city,
        age=user_in.age,
        hashed_password=await get_password_hash(user_in.password),
        type=UserRole.CLIENT,
    )


async def _issue_tokens(db: AsyncSession, user: User) -> Token:
    """Shared by login and refresh: mints a fresh access+refresh pair and
    persists the new refresh token's jti as the one-and-only currently
    valid refresh token for this user (dropping whichever one it replaces).
    """
    new_jti = uuid.uuid4()
    access_token = create_access_token(subject=str(user.id), token_version=user.token_version)
    refresh_token = create_refresh_token(
        subject=str(user.id), token_version=user.token_version, jti=str(new_jti)
    )
    await user_crud.update(db, user, current_refresh_token_id=new_jti)
    return Token(access_token=access_token, refresh_token=refresh_token)


async def login(db: AsyncSession, credentials: LoginRequest) -> Token:
    user = await user_crud.get_by_email(db, credentials.email)
    if user is None or not await verify_password(credentials.password, user.hashed_password):
        # Same error for "no such user" and "wrong password" — a distinct
        # message for either would let a caller enumerate registered emails.
        raise InvalidCredentialsError()

    if user.is_deleted:
        raise AccountDeactivatedError()

    return await _issue_tokens(db, user)


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> Token:
    """Rotation: every successful refresh issues a brand new access+refresh
    pair and immediately invalidates the one just used, by overwriting
    current_refresh_token_id. Presenting an already-rotated-out refresh
    token again (a replay of a stolen one, most likely) is treated as a
    compromise signal: it kills every session for the account (bumps
    token_version and clears current_refresh_token_id), not just the one
    being attempted.
    """
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise InvalidRefreshTokenError() from None

    if payload.token_type != "refresh" or payload.jti is None:
        raise InvalidRefreshTokenError()

    user = await user_crud.get_by_id(db, payload.subject)
    if user is None:
        raise InvalidRefreshTokenError()
    if user.is_deleted:
        raise AccountDeactivatedError()
    if user.token_version != payload.token_version:
        raise InvalidRefreshTokenError()

    if user.current_refresh_token_id is None or str(user.current_refresh_token_id) != payload.jti:
        await user_crud.update(
            db, user, token_version=user.token_version + 1, current_refresh_token_id=None
        )
        raise InvalidRefreshTokenError()

    return await _issue_tokens(db, user)
