"""Unit tests for InMemoryRateLimiter -- an injectable clock keeps these
deterministic and fast, no real sleeping.
"""

import pytest

from app.core.exceptions import RateLimitExceededError
from app.core.rate_limit import InMemoryRateLimiter


def test_allows_up_to_max_attempts():
    limiter = InMemoryRateLimiter(max_attempts=3, window_seconds=60, now_fn=lambda: 0.0)
    limiter.check("a")
    limiter.check("a")
    limiter.check("a")  # 3rd is still fine


def test_blocks_after_max_attempts():
    limiter = InMemoryRateLimiter(max_attempts=3, window_seconds=60, now_fn=lambda: 0.0)
    limiter.check("a")
    limiter.check("a")
    limiter.check("a")
    with pytest.raises(RateLimitExceededError):
        limiter.check("a")


def test_different_keys_tracked_independently():
    limiter = InMemoryRateLimiter(max_attempts=1, window_seconds=60, now_fn=lambda: 0.0)
    limiter.check("a")
    limiter.check("b")  # different key, not blocked by "a"'s usage


def test_window_expiry_allows_new_attempts():
    clock = {"t": 0.0}
    limiter = InMemoryRateLimiter(max_attempts=1, window_seconds=10, now_fn=lambda: clock["t"])

    limiter.check("a")
    with pytest.raises(RateLimitExceededError):
        limiter.check("a")

    clock["t"] = 11.0  # past the 10s window
    limiter.check("a")  # allowed again


def test_lru_eviction_caps_memory():
    limiter = InMemoryRateLimiter(
        max_attempts=100, window_seconds=60, max_tracked_keys=2, now_fn=lambda: 0.0
    )
    limiter.check("a")
    limiter.check("b")
    limiter.check("c")  # evicts "a", the least-recently-used

    assert "a" not in limiter._hits
    assert "b" in limiter._hits
    assert "c" in limiter._hits


def test_reset_clears_state():
    limiter = InMemoryRateLimiter(max_attempts=1, window_seconds=60, now_fn=lambda: 0.0)
    limiter.check("a")
    limiter.reset()
    limiter.check("a")  # would have raised if not reset
