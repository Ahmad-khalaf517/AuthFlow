"""User management endpoints — protected routes.

TODO:
- GET    /                  (admin only; paginated + filtered list)
- PUT    /{user_id}         (admin only)
- DELETE /{user_id}         (admin only; soft delete)
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.models.user import User, UserRole
from app.schemas.user import UserCreateByAdmin, UserRead, UserUpdate
from app.services import user_service

router = APIRouter()


@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: User = Depends(get_current_user)) -> UserRead:
    return current_user


@router.put("/me", response_model=UserRead)
async def update_current_user(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    return await user_service.update_own_profile(db, current_user, user_in)


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def create_user(user_in: UserCreateByAdmin, db: AsyncSession = Depends(get_db)) -> UserRead:
    return await user_service.create_user_as_admin(db, user_in)
