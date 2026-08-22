"""Authentication endpoints — public routes.

TODO:
- POST /register
- POST /login       (OAuth2PasswordRequestForm -> JWT access + refresh token)
- POST /refresh
- POST /logout
"""
from fastapi import APIRouter

router = APIRouter()
