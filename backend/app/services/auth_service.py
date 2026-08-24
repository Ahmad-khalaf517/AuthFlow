"""Authentication business logic."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AccountDeactivatedError, DuplicateEmailError, InvalidCredentialsError
from app.core.security import create_access_token, get_password_hash, verify_password
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


async def login(db: AsyncSession, credentials: LoginRequest) -> Token:
    user = await user_crud.get_by_email(db, credentials.email)
    if user is None or not await verify_password(credentials.password, user.hashed_password):
        # Same error for "no such user" and "wrong password" — a distinct
        # message for either would let a caller enumerate registered emails.
        raise InvalidCredentialsError()

    if user.is_deleted:
        raise AccountDeactivatedError()

    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token)
