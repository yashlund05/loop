# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Tests for join code verification rate limiting (5 failures per hour per user).

Roadmap Acceptance Check:
- Wrong join code is rejected (HTTP 400), and rate-limited after 5 failed attempts (HTTP 429).
"""

import time

from app.services.rate_limiter import JoinCodeRateLimiter


def test_rate_limiter_allows_up_to_5_failures() -> None:
    limiter = JoinCodeRateLimiter(max_failures=5, window_seconds=3600)
    user_id = "test-user-1"

    for _ in range(5):
        assert not limiter.is_rate_limited(user_id)
        limiter.record_failure(user_id)

    # 5 failures recorded, next attempt is blocked
    assert limiter.is_rate_limited(user_id)


def test_rate_limiter_resets_on_success() -> None:
    limiter = JoinCodeRateLimiter(max_failures=5, window_seconds=3600)
    user_id = "test-user-2"

    for _ in range(4):
        limiter.record_failure(user_id)

    assert not limiter.is_rate_limited(user_id)
    limiter.reset(user_id)
    assert limiter.get_failure_count(user_id) == 0


def test_rate_limiter_window_expiration() -> None:
    limiter = JoinCodeRateLimiter(max_failures=5, window_seconds=10)
    user_id = "test-user-3"

    # Simulate 5 failures 15 seconds ago
    past_time = time.time() - 15
    for _ in range(5):
        limiter._attempts[user_id].append(past_time)

    assert not limiter.is_rate_limited(user_id)
