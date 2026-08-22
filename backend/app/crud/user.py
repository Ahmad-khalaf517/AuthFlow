"""User CRUD operations."""
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateEmailError
from app.models.user import User


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, **fields) -> User:
    user = User(**fields)
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        # Closes the check-then-insert race: two concurrent registrations
        # with the same email can both pass the get_by_email check above,
        # but only one can win the DB's unique constraint.
        await db.rollback()
        raise DuplicateEmailError() from None
    await db.refresh(user)
    return user
