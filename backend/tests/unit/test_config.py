"""Unit tests for Settings' production safety guard."""
import pytest

from app.core.config import Settings


def test_default_secret_key_is_fine_in_development():
    settings = Settings(ENVIRONMENT="development", SECRET_KEY="change-me")
    assert settings.SECRET_KEY == "change-me"


def test_default_secret_key_rejected_outside_development():
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(ENVIRONMENT="production", SECRET_KEY="change-me")


def test_custom_secret_key_allowed_in_any_environment():
    settings = Settings(ENVIRONMENT="production", SECRET_KEY="a-real-random-secret")
    assert settings.SECRET_KEY == "a-real-random-secret"
