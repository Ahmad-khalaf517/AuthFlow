"""Public statistics endpoints — no authentication required.

All figures are scoped to active (non-soft-deleted) users.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.stats import AverageAgeResponse, TopCitiesResponse, UserCountResponse
from app.services import stats_service

router = APIRouter()


@router.get("/count", response_model=UserCountResponse)
async def get_user_count(db: AsyncSession = Depends(get_db)) -> UserCountResponse:
    total = await stats_service.count_active_users(db)
    return UserCountResponse(total_users=total)


@router.get("/average-age", response_model=AverageAgeResponse)
async def get_average_age(db: AsyncSession = Depends(get_db)) -> AverageAgeResponse:
    average = await stats_service.average_age_of_active_users(db)
    return AverageAgeResponse(average_age=average)


@router.get("/top-cities", response_model=TopCitiesResponse)
async def get_top_cities(db: AsyncSession = Depends(get_db)) -> TopCitiesResponse:
    cities = await stats_service.top_cities_of_active_users(db)
    return TopCitiesResponse(cities=cities)
