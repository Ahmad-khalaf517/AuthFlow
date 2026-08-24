"""User management endpoints — protected routes."""
from math import ceil
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.models.user import User, UserRole
from app.schemas.user import (
    UserAdminUpdate,
    UserCreateByAdmin,
    UserListResponse,
    UserRead,
    UserUpdate,
)
from app.services import user_service

router = APIRouter()

MAX_PAGE_LIMIT = 100


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


@router.get("", response_model=UserListResponse, dependencies=[Depends(require_role(UserRole.ADMIN))])
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=MAX_PAGE_LIMIT),
    first_name: str | None = Query(None),
    last_name: str | None = Query(None),
    email: str | None = Query(None),
    city: str | None = Query(None),
    age: int | None = Query(None, gt=0, le=120),
    type: UserRole | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> UserListResponse:
    users, total = await user_service.list_users(
        db,
        page=page,
        limit=limit,
        first_name=first_name,
        last_name=last_name,
        email=email,
        city=city,
        age=age,
        type=type,
    )
    total_pages = ceil(total / limit) if total else 0
    return UserListResponse(page=page, limit=limit, total=total, total_pages=total_pages, users=users)


@router.put(
    "/{user_id}",
    response_model=UserRead,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def admin_update_user(
    user_id: UUID, user_in: UserAdminUpdate, db: AsyncSession = Depends(get_db)
) -> UserRead:
    return await user_service.admin_update_user(db, user_id, user_in)


@router.delete(
    "/{user_id}",
    response_model=UserRead,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def admin_delete_user(user_id: UUID, db: AsyncSession = Depends(get_db)) -> UserRead:
    return await user_service.admin_soft_delete_user(db, user_id)
