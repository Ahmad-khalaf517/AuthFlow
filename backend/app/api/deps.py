"""Shared API dependencies: DB session, current user, role guards.

JWT -> get_current_user (identify) -> require_role (authorize) -> route.
"""
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose.exceptions import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AccountDeactivatedError, NotAuthenticatedError, PermissionDeniedError
from app.core.security import decode_token
from app.crud import user as user_crud
from app.db.session import get_db
from app.models.user import User, UserRole

__all__ = ["get_db", "get_current_user", "require_role"]

# auto_error=False so a missing/malformed header goes through our own
# NotAuthenticatedError -> consistent {"detail": ...} error shape, instead of
# HTTPBearer's own default (a bare 403 with a different body format).
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Authentication: who is making this request?

    Trusts nothing from the token except the user id. Role and soft-delete
    status are re-read from the DB on every call, so a token issued before a
    demotion or deletion can't keep asserting stale permissions.
    """
    if credentials is None:
        raise NotAuthenticatedError()

    try:
        user_id = decode_token(credentials.credentials)
    except JWTError:
        raise NotAuthenticatedError() from None

    user = await user_crud.get_by_id(db, user_id)
    if user is None:
        raise NotAuthenticatedError()
    if user.is_deleted:
        raise AccountDeactivatedError()

    return user


def require_role(*allowed_roles: UserRole):
    """Authorization: is this (already-authenticated) user allowed to do this?"""

    async def _role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.type not in allowed_roles:
            raise PermissionDeniedError()
        return current_user

    return _role_checker
