"""User Pydantic schemas."""

import re
from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole

_PHONE_RE = re.compile(r"^\+?[1-9]\d{7,14}$")
_PASSWORD_LETTER_RE = re.compile(r"[A-Za-z]")
_PASSWORD_DIGIT_RE = re.compile(r"\d")


def _not_blank(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("must not be empty")
    return value


def _valid_phone(value: str) -> str:
    if not _PHONE_RE.match(value):
        raise ValueError("must be a valid phone number, e.g. +96170123456")
    return value


def _valid_password(value: str) -> str:
    if not _PASSWORD_LETTER_RE.search(value) or not _PASSWORD_DIGIT_RE.search(value):
        raise ValueError("password must contain at least one letter and one number")
    return value


class UserBase(BaseModel):
    first_name: Annotated[str, Field(min_length=1, max_length=100)]
    last_name: Annotated[str, Field(min_length=1, max_length=100)]
    email: EmailStr
    phone_number: Annotated[str, Field(min_length=8, max_length=20)]
    city: Annotated[str, Field(min_length=1, max_length=100)]
    age: Annotated[int, Field(gt=0, le=120)]

    @field_validator("first_name", "last_name", "city")
    @classmethod
    def not_blank(cls, value: str) -> str:
        return _not_blank(value)

    @field_validator("phone_number")
    @classmethod
    def valid_phone(cls, value: str) -> str:
        return _valid_phone(value)


class UserCreate(UserBase):
    """Public registration payload.

    Deliberately has no `type` field — role is never client-controlled.
    `extra="forbid"` rejects the request outright if one is sent anyway,
    rather than silently accepting it and dropping the field.
    """

    model_config = ConfigDict(extra="forbid")

    password: Annotated[str, Field(min_length=8, max_length=128)]

    @field_validator("password")
    @classmethod
    def valid_password(cls, value: str) -> str:
        return _valid_password(value)


class UserCreateByAdmin(UserCreate):
    """Admin-only user creation — the caller explicitly chooses the role.

    Safe only because the route requires an authenticated admin
    (require_role(ADMIN)); this schema on its own enforces nothing about
    who's allowed to submit it.
    """

    type: UserRole


class UserUpdate(BaseModel):
    """Partial self-service profile update (PUT /users/me).

    Every field is optional — only what's provided gets changed (callers
    read this via `model_dump(exclude_unset=True)`, not by checking for
    None, since none of these fields are meant to ever be nulled out).
    Deliberately has no `type` field, same as UserCreate: a client can never
    change their own role, and `extra="forbid"` rejects the attempt outright
    rather than silently ignoring it.
    """

    model_config = ConfigDict(extra="forbid")

    first_name: Annotated[str, Field(min_length=1, max_length=100)] | None = None
    last_name: Annotated[str, Field(min_length=1, max_length=100)] | None = None
    email: EmailStr | None = None
    phone_number: Annotated[str, Field(min_length=8, max_length=20)] | None = None
    city: Annotated[str, Field(min_length=1, max_length=100)] | None = None
    age: Annotated[int, Field(gt=0, le=120)] | None = None
    password: Annotated[str, Field(min_length=8, max_length=128)] | None = None

    @field_validator("first_name", "last_name", "city")
    @classmethod
    def not_blank(cls, value: str | None) -> str | None:
        return value if value is None else _not_blank(value)

    @field_validator("phone_number")
    @classmethod
    def valid_phone(cls, value: str | None) -> str | None:
        return value if value is None else _valid_phone(value)

    @field_validator("password")
    @classmethod
    def valid_password(cls, value: str | None) -> str | None:
        return value if value is None else _valid_password(value)


class UserAdminUpdate(UserUpdate):
    """Admin update of any user (PUT /users/{id}) — unlike UserUpdate, the
    admin *is* allowed to change the role. Still optional/partial.
    """

    type: UserRole | None = None


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: UserRole
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int
    users: list[UserRead]
