"""A minimal in-process rate limiter for brute-force protection on login.

Deliberately not a general-purpose library: single-process, sliding-window,
keyed by an arbitrary string (the caller decides what — client IP here).
Fine for one Uvicorn instance; a multi-instance deployment needs a shared
store (e.g. Redis) instead, since none of this state is shared across
workers or survives a restart.
"""

import time
from collections import OrderedDict
from collections.abc import Callable

from app.core.exceptions import RateLimitExceededError


class InMemoryRateLimiter:
    """Tracked keys are capped and LRU-evicted so an attacker rotating
    through many distinct identifiers (e.g. spoofed IPs) can't grow this
    unboundedly -- a rate limiter that itself leaks memory under adversarial
    conditions would be a bad trade.
    """

    def __init__(
        self,
        max_attempts: int,
        window_seconds: float,
        max_tracked_keys: int = 10_000,
        now_fn: Callable[[], float] = time.monotonic,
    ):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.max_tracked_keys = max_tracked_keys
        self._now = now_fn
        self._hits: OrderedDict[str, list[float]] = OrderedDict()

    def check(self, key: str) -> None:
        """Raises RateLimitExceededError if `key` has hit the limit within
        the current window; otherwise records this call and returns.
        """
        now = self._now()
        cutoff = now - self.window_seconds

        hits = [t for t in self._hits.get(key, []) if t >= cutoff]

        if len(hits) >= self.max_attempts:
            self._hits[key] = hits
            self._hits.move_to_end(key)
            raise RateLimitExceededError()

        hits.append(now)
        self._hits[key] = hits
        self._hits.move_to_end(key)

        while len(self._hits) > self.max_tracked_keys:
            self._hits.popitem(last=False)

    def reset(self) -> None:
        """Test-only: clear all tracked state."""
        self._hits.clear()
