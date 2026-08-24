"""Application settings loaded from environment variables / .env file."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env — anchored to this file's location, not the process's current
# working directory, so it resolves the same whether the app is launched
# from backend/ (uvicorn, pytest, alembic) or the repo root.
BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    PROJECT_NAME: str = "AuthFlow"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    DATABASE_URL: str = "sqlite+aiosqlite:///./authflow.db"

    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]


settings = Settings()
