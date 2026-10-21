# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Tests for join code verification rate limiting (per-user and per-IP).

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


def test_rate_limiter_per_ip_limit() -> None:
    limiter = JoinCodeRateLimiter(max_failures=5, ip_max_failures=3, window_seconds=3600)
    ip_addr = "192.168.1.100"

    for i in range(3):
        assert not limiter.is_rate_limited(f"user-{i}", client_ip=ip_addr)
        limiter.record_failure(f"user-{i}", client_ip=ip_addr)

    # IP limit reached, even a new user from that IP is blocked
    assert limiter.is_rate_limited("new-user", client_ip=ip_addr)


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
        limiter._user_attempts[user_id].append(past_time)

    assert not limiter.is_rate_limited(user_id)
