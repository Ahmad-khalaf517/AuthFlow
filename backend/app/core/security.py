"""Password hashing and JWT helpers.

TODO:
- verify_password(plain_password, hashed_password) -> bool   (passlib)
- get_password_hash(password) -> str                          (passlib)
- create_access_token(subject, expires_delta=None) -> str     (python-jose)
- create_refresh_token(subject, expires_delta=None) -> str
- decode_token(token) -> TokenPayload
"""
