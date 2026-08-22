"""SQLAlchemy declarative base and model registry for Alembic autogenerate."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import models here so Alembic's autogenerate can discover them, e.g.:
# from app.models.user import User  # noqa: F401
