"""User CRUD operations."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateEmailError
from app.models.user import User, UserRole


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_by_id(db: AsyncSession, user_id: str) -> User | None:
    try:
        pk = UUID(user_id)
    except ValueError:
        return None
    return await db.get(User, pk)


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


async def update(db: AsyncSession, user: User, **fields) -> User:
    for key, value in fields.items():
        setattr(user, key, value)
    try:
        await db.commit()
    except IntegrityError:
        # Same email race as create(), but for a concurrent email change.
        await db.rollback()
        raise DuplicateEmailError() from None
    await db.refresh(user)
    return user


async def soft_delete(db: AsyncSession, user: User) -> User:
    user.is_deleted = True
    user.deleted_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(user)
    return user


async def list_paginated(
    db: AsyncSession,
    *,
    page: int,
    limit: int,
    first_name: str | None = None,
    last_name: str | None = None,
    email: str | None = None,
    city: str | None = None,
    age: int | None = None,
    type: UserRole | None = None,
) -> tuple[list[User], int]:
    """Soft-deleted users are always excluded — they don't belong in a
    normal listing. Text fields use case-insensitive partial matching
    (covers "filter by city" and "search by name" with one mechanism);
    age and type are exact, since a partial match makes no sense for either.
    """
    conditions: list[ColumnElement[bool]] = [User.is_deleted.is_(False)]
    if first_name is not None:
        conditions.append(User.first_name.ilike(f"%{first_name}%"))
    if last_name is not None:
        conditions.append(User.last_name.ilike(f"%{last_name}%"))
    if email is not None:
        conditions.append(User.email.ilike(f"%{email}%"))
    if city is not None:
        conditions.append(User.city.ilike(f"%{city}%"))
    if age is not None:
        conditions.append(User.age == age)
    if type is not None:
        conditions.append(User.type == type)

    total = (
        await db.execute(select(func.count()).select_from(User).where(*conditions))
    ).scalar_one()

    rows = await db.execute(
        select(User)
        .where(*conditions)
        .order_by(User.created_at)
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return list(rows.scalars().all()), total


async def count_active(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count()).select_from(User).where(User.is_deleted.is_(False))
    )
    return result.scalar_one()


async def average_age_active(db: AsyncSession) -> float:
    result = await db.execute(select(func.avg(User.age)).where(User.is_deleted.is_(False)))
    average = result.scalar_one()
    return round(float(average), 2) if average is not None else 0.0


async def top_cities_active(db: AsyncSession, *, limit: int = 3) -> list[tuple[str, int]]:
    result = await db.execute(
        select(User.city, func.count().label("count"))
        .where(User.is_deleted.is_(False))
        .group_by(User.city)
        .order_by(func.count().desc())
        .limit(limit)
    )
    return list(result.tuples().all())
