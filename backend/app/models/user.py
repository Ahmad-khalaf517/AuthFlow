"""User ORM model."""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Index, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CLIENT = "client"


def _trgm_index(name: str, column: str) -> Index:
    """A GIN trigram index -- unlike the plain btree index already on
    `type`, this actually accelerates the ILIKE '%...%' filters GET /users
    uses for first_name/last_name/email/city, since a leading wildcard
    can't use a standard btree index at all. Declared here (not just as a
    raw migration) so a future `alembic revision --autogenerate` recognizes
    these as intentional instead of proposing to drop them.

    postgresql_using/postgresql_ops are PostgreSQL-only Index arguments --
    SQLAlchemy silently ignores them on other dialects, so this degrades to
    a harmless plain index on the SQLite fallback used by the test suite.
    """
    return Index(name, column, postgresql_using="gin", postgresql_ops={column: "gin_trgm_ops"})


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        _trgm_index("ix_users_first_name_trgm", "first_name"),
        _trgm_index("ix_users_last_name_trgm", "last_name"),
        _trgm_index("ix_users_email_trgm", "email"),
        _trgm_index("ix_users_city_trgm", "city"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone_number: Mapped[str] = mapped_column(String(32), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)

    type: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda role: [r.value for r in role]),
        default=UserRole.CLIENT,
        nullable=False,
        index=True,  # GET /users filters by type; low-cardinality but real at scale
    )

    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Bumped whenever the password changes; embedded in JWTs as "ver" and
    # checked in get_current_user. Lets a password change immediately
    # invalidate every previously issued token (e.g. a stolen one) instead
    # of leaving them valid until natural expiry.
    token_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # The jti of the one refresh token currently valid for this user.
    # POST /auth/refresh requires the incoming token's jti to match this
    # exactly; using an already-rotated-out refresh token (a replay of a
    # stolen one, most likely) is treated as a compromise signal and kills
    # every session (see auth_service.refresh_tokens).
    current_refresh_token_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)

    # Soft delete: is_deleted for cheap filtering, deleted_at for the audit trail.
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
