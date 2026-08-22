"""Authentication business logic."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateEmailError
from app.core.security import get_password_hash
from app.crud import user as user_crud
from app.models.user import User, UserRole
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
        hashed_password=get_password_hash(user_in.password),
        type=UserRole.CLIENT,
    )
