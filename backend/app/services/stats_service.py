"""Public statistics business logic — all scoped to active (non-soft-deleted) users."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import user as user_crud
from app.schemas.stats import CityCount


async def count_active_users(db: AsyncSession) -> int:
    return await user_crud.count_active(db)


async def average_age_of_active_users(db: AsyncSession) -> float:
    return await user_crud.average_age_active(db)


async def top_cities_of_active_users(db: AsyncSession, *, limit: int = 3) -> list[CityCount]:
    rows = await user_crud.top_cities_active(db, limit=limit)
    return [CityCount(city=city, count=count) for city, count in rows]
