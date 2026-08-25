"""User management business logic."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import CannotTargetSelfError, DuplicateEmailError, UserNotFoundError
from app.core.security import get_password_hash
from app.crud import user as user_crud
from app.models.user import User, UserRole
from app.schemas.user import UserAdminUpdate, UserCreateByAdmin, UserUpdate


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
        hashed_password=await get_password_hash(user_in.password),
        type=user_in.type,
    )


async def update_own_profile(db: AsyncSession, current_user: User, user_in: UserUpdate) -> User:
    """Self-service profile update. `user_in` has no `type` field at the
    schema level (see UserUpdate), so there's no role to accidentally trust
    here even in principle.
    """
    updates = user_in.model_dump(exclude_unset=True)

    new_email = updates.get("email")
    if new_email is not None:
        existing = await user_crud.get_by_email(db, new_email)
        if existing is not None and existing.id != current_user.id:
            raise DuplicateEmailError()

    if "password" in updates:
        updates["hashed_password"] = await get_password_hash(updates.pop("password"))
        # Invalidates every token issued before this change (see get_current_user).
        updates["token_version"] = current_user.token_version + 1

    return await user_crud.update(db, current_user, **updates)


async def admin_update_user(
    db: AsyncSession, user_id: UUID, user_in: UserAdminUpdate, current_admin: User
) -> User:
    """Admin update of any user, including their role. Safe only because the
    route requires require_role(ADMIN) — this function does no permission
    checking of its own, same rationale as create_user_as_admin.

    Deliberately excludes the caller's own account: this route can hand out
    or take away admin rights, so editing yourself through it (even
    unintentionally) risks an accidental self-demotion. Self-service edits
    belong on PUT /users/me instead, which can't touch the role at all.
    """
    if user_id == current_admin.id:
        raise CannotTargetSelfError(
            "Admins cannot update their own account through this endpoint. "
            "Use PUT /users/me instead."
        )

    target = await user_crud.get_by_id(db, str(user_id))
    if target is None:
        raise UserNotFoundError()

    updates = user_in.model_dump(exclude_unset=True)

    new_email = updates.get("email")
    if new_email is not None:
        existing = await user_crud.get_by_email(db, new_email)
        if existing is not None and existing.id != target.id:
            raise DuplicateEmailError()

    if "password" in updates:
        updates["hashed_password"] = await get_password_hash(updates.pop("password"))
        updates["token_version"] = target.token_version + 1

    return await user_crud.update(db, target, **updates)


async def admin_soft_delete_user(db: AsyncSession, user_id: UUID, current_admin: User) -> User:
    """Deliberately excludes the caller's own account -- letting an admin
    soft-delete themselves risks locking them out with no way back in
    (worse still if they're the only admin left), for no real benefit over
    having a *different* admin do it.
    """
    if user_id == current_admin.id:
        raise CannotTargetSelfError("Admins cannot delete their own account.")

    target = await user_crud.get_by_id(db, str(user_id))
    if target is None:
        raise UserNotFoundError()

    return await user_crud.soft_delete(db, target)


async def list_users(
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
    return await user_crud.list_paginated(
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
