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


class UserNotFoundError(AppError):
    status_code = 404
    detail = "User not found"


class ServiceUnavailableError(AppError):
    status_code = 503
    detail = "Service temporarily unavailable"


class RateLimitExceededError(AppError):
    status_code = 429
    detail = "Too many attempts. Please try again later."


class InvalidRefreshTokenError(AppError):
    status_code = 401
    detail = "Invalid or expired refresh token"


class CannotTargetSelfError(AppError):
    status_code = 403
    detail = "Admins cannot perform this action on their own account through this endpoint"
