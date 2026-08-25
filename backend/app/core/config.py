"""Application settings loaded from environment variables / .env file."""
from pathlib import Path
from typing import Self

from pydantic import model_validator
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
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "sqlite+aiosqlite:///./authflow.db"

    # Postgres connection pool (ignored for the SQLite fallback — see
    # db/session.py). pool_recycle comfortably undercuts Neon's idle
    # auto-suspend so pooled connections get refreshed before that happens,
    # pairing with pool_pre_ping's after-the-fact reconnect-on-failure.
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE_SECONDS: int = 1800

    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Login brute-force protection. In-process only -- fine for a single
    # instance; a multi-instance deployment needs a shared store (Redis)
    # instead, since this state isn't shared across workers.
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: int = 5
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: float = 60.0

    @model_validator(mode="after")
    def _reject_default_secret_outside_development(self) -> Self:
        """The classic production footgun: an env file copied from
        .env.example, deployed as-is, with SECRET_KEY still "change-me" --
        anyone can then forge valid JWTs for any user. Fails loudly at
        startup instead of running "successfully" with a known secret.
        """
        if self.ENVIRONMENT != "development" and self.SECRET_KEY == "change-me":
            raise ValueError(
                "SECRET_KEY is still the insecure default ('change-me') while "
                f"ENVIRONMENT={self.ENVIRONMENT!r}. Set a real random SECRET_KEY "
                "before running outside of development."
            )
        return self


settings = Settings()
