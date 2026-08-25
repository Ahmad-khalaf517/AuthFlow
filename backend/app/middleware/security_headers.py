"""Adds standard security-hardening headers to every response.

No Content-Security-Policy here on purpose: FastAPI's built-in /docs and
/redoc pages load their JS/CSS from a CDN, and a strict CSP would break
them without a much larger nonce/allowlist effort that isn't worth it for
an API that serves no other HTML. Documented as a deliberate gap, not an
oversight, same as the rest of docs/AUDIT.md.
"""

from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

SECURITY_HEADERS = {
    # Only honored by browsers over HTTPS; harmless to send over plain HTTP
    # (e.g. local dev), so applied unconditionally rather than gated on
    # settings.ENVIRONMENT.
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), camera=(), microphone=(), payment=()",
    # The legacy filter this used to enable is itself a known source of
    # vulnerabilities and every modern browser has dropped it -- "0"
    # explicitly disables it rather than turning it on.
    "X-XSS-Protection": "0",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        for header, value in SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        return response
