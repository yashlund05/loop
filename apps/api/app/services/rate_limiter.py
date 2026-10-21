# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""In-memory rate limiter for join-code attempts."""

import time
from collections import defaultdict


class JoinCodeRateLimiter:
    """Sliding-window rate limiter for join code verification failures.

    Defaults to a maximum of 5 failures per hour (3600 seconds) per user.
    """

    def __init__(self, max_failures: int = 5, window_seconds: int = 3600) -> None:
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = defaultdict(list)

    def _cleanup(self, user_id: str, now: float) -> None:
        cutoff = now - self.window_seconds
        self._attempts[user_id] = [t for t in self._attempts[user_id] if t > cutoff]

    def record_failure(self, user_id: str) -> None:
        now = time.time()
        self._cleanup(user_id, now)
        self._attempts[user_id].append(now)

    def is_rate_limited(self, user_id: str) -> bool:
        now = time.time()
        self._cleanup(user_id, now)
        return len(self._attempts[user_id]) >= self.max_failures

    def reset(self, user_id: str) -> None:
        if user_id in self._attempts:
            del self._attempts[user_id]

    def get_failure_count(self, user_id: str) -> int:
        now = time.time()
        self._cleanup(user_id, now)
        return len(self._attempts[user_id])


# Global rate limiter instance
join_code_rate_limiter = JoinCodeRateLimiter(max_failures=5, window_seconds=3600)
