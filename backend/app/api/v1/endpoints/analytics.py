"""Basic analytics endpoints — admin only, protected routes.

TODO:
- GET /analytics/users/summary   (total, active, deleted, by role)
- GET /analytics/users/growth    (signups over time)
"""
from fastapi import APIRouter

router = APIRouter()
