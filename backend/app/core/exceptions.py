"""Custom application exceptions.

Raised from services/CRUD and translated to HTTP responses in
app.middleware.error_handler.
"""


class AppError(Exception):
    status_code = 500
    detail = "Internal server error"

    def __init__(self, detail: str | None = None):
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class DuplicateEmailError(AppError):
    status_code = 409
    detail = "A user with this email already exists"


class InvalidCredentialsError(AppError):
    status_code = 401
    detail = "Incorrect email or password"


class AccountDeactivatedError(AppError):
    status_code = 403
    detail = "This account has been deactivated"


class NotAuthenticatedError(AppError):
    status_code = 401
    detail = "Could not validate credentials"


class PermissionDeniedError(AppError):
    status_code = 403
    detail = "You do not have permission to perform this action"
