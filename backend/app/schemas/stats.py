"""Public statistics schemas — all scoped to active (non-soft-deleted) users."""
from pydantic import BaseModel


class UserCountResponse(BaseModel):
    total_users: int


class AverageAgeResponse(BaseModel):
    average_age: float


class CityCount(BaseModel):
    city: str
    count: int


class TopCitiesResponse(BaseModel):
    cities: list[CityCount]
