"""User management endpoints — protected routes.

TODO:
- GET    /me                (current user profile)
- PUT    /me                (update own profile)
- GET    /                  (admin only; paginated + filtered list)
- GET    /{user_id}         (admin only)
- DELETE /{user_id}         (admin only; soft delete)
"""
from fastapi import APIRouter

router = APIRouter()
