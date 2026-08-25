"""Unit tests for User Pydantic schemas — pure validation, no DB/HTTP."""

import pytest
from pydantic import ValidationError

from app.schemas.user import UserCreate

VALID = {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone_number": "+96170123456",
    "city": "Tripoli",
    "age": 25,
    "password": "Password123",
}


def test_valid_payload_parses():
    user = UserCreate(**VALID)
    assert user.email == "john@example.com"


def test_rejects_type_field():
    with pytest.raises(ValidationError):
        UserCreate(**VALID, type="admin")


@pytest.mark.parametrize("field", ["first_name", "last_name", "city"])
def test_rejects_blank_fields(field):
    with pytest.raises(ValidationError):
        UserCreate(**{**VALID, field: "   "})


def test_rejects_invalid_email():
    with pytest.raises(ValidationError):
        UserCreate(**{**VALID, "email": "not-an-email"})


def test_rejects_invalid_phone():
    with pytest.raises(ValidationError):
        UserCreate(**{**VALID, "phone_number": "123"})


@pytest.mark.parametrize("age", [0, -5, 200])
def test_rejects_invalid_age(age):
    with pytest.raises(ValidationError):
        UserCreate(**{**VALID, "age": age})


def test_rejects_short_password():
    with pytest.raises(ValidationError):
        UserCreate(**{**VALID, "password": "abc123"})


def test_rejects_password_without_digit():
    with pytest.raises(ValidationError):
        UserCreate(**{**VALID, "password": "alllettersnodigits"})


def test_rejects_password_without_letter():
    with pytest.raises(ValidationError):
        UserCreate(**{**VALID, "password": "12345678"})
