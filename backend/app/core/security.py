"""Password hashing helpers.

JWT helpers (create_access_token / decode_token) land alongside the login endpoint.
"""
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

_hasher = PasswordHasher()


def get_password_hash(password: str) -> str:
    return _hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return _hasher.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False
