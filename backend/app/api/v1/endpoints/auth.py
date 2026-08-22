"""Authentication endpoints — public routes.

TODO:
- POST /login
- POST /refresh
- POST /logout
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.user import UserCreate, UserRead
from app.services import auth_service

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)) -> UserRead:
    return await auth_service.register_user(db, user_in)
