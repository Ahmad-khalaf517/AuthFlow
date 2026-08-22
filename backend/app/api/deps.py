"""Shared API dependencies.

TODO once login exists:
- get_current_user(token, db) -> User        (decode JWT, fetch user)
- get_current_active_user(user) -> User      (reject inactive/soft-deleted)
- require_role(*roles) -> Callable           (role-based authorization guard)
"""
from app.db.session import get_db

__all__ = ["get_db"]
