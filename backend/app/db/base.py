"""SQLAlchemy declarative base and model registry for Alembic autogenerate."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Models must be imported wherever this metadata is used for table creation
# or autogenerate — see alembic/env.py and tests/conftest.py.
