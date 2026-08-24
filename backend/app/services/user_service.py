"""User management business logic.

TODO: get_profile, update_profile, list_users (paginated/filtered), deactivate_user, analytics_summary
"""
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateEmailError
from app.core.security import get_password_hash
from app.crud import user as user_crud
from app.models.user import User
from app.schemas.user import UserCreateByAdmin


async def create_user_as_admin(db: AsyncSession, user_in: UserCreateByAdmin) -> User:
    """Admin-only user creation. `user_in.type` is trusted here only because
    the route already required an authenticated admin (require_role(ADMIN))
    to reach this function — this layer doesn't re-check that itself.
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
        type=user_in.type,
    )
