# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""In-memory rate limiter for join-code attempts with dual User and IP tracking.

KNOWN LIMITATIONS:
- In-memory state is single-instance only and resets on application restart.
- For distributed multi-instance production deployments, replace with Redis / Valkey.
"""

import time
from collections import defaultdict
from typing import Optional


class JoinCodeRateLimiter:
    """Sliding-window rate limiter for join code verification failures.

    Tracks both user ID and client IP independently.
    Defaults to a maximum of 5 failures per hour (3600 seconds).
    """

    def __init__(
        self,
        max_failures: int = 5,
        ip_max_failures: int = 10,
        window_seconds: int = 3600,
    ) -> None:
        self.max_failures = max_failures
        self.ip_max_failures = ip_max_failures
        self.window_seconds = window_seconds
        self._user_attempts: dict[str, list[float]] = defaultdict(list)
        self._ip_attempts: dict[str, list[float]] = defaultdict(list)

    def _cleanup_list(self, attempts: list[float], now: float) -> list[float]:
        cutoff = now - self.window_seconds
        return [t for t in attempts if t > cutoff]

    def record_failure(self, user_id: str, client_ip: Optional[str] = None) -> None:
        now = time.time()
        self._user_attempts[user_id] = self._cleanup_list(self._user_attempts[user_id], now)
        self._user_attempts[user_id].append(now)

        if client_ip:
            self._ip_attempts[client_ip] = self._cleanup_list(self._ip_attempts[client_ip], now)
            self._ip_attempts[client_ip].append(now)

    def is_rate_limited(self, user_id: str, client_ip: Optional[str] = None) -> bool:
        now = time.time()
        self._user_attempts[user_id] = self._cleanup_list(self._user_attempts[user_id], now)
        if len(self._user_attempts[user_id]) >= self.max_failures:
            return True

        if client_ip:
            self._ip_attempts[client_ip] = self._cleanup_list(self._ip_attempts[client_ip], now)
            if len(self._ip_attempts[client_ip]) >= self.ip_max_failures:
                return True

        return False

    def reset(self, user_id: str, client_ip: Optional[str] = None) -> None:
        if user_id in self._user_attempts:
            del self._user_attempts[user_id]
        if client_ip and client_ip in self._ip_attempts:
            del self._ip_attempts[client_ip]

    def get_failure_count(self, user_id: str) -> int:
        now = time.time()
        self._user_attempts[user_id] = self._cleanup_list(self._user_attempts[user_id], now)
        return len(self._user_attempts[user_id])

    def get_ip_failure_count(self, client_ip: str) -> int:
        now = time.time()
        self._ip_attempts[client_ip] = self._cleanup_list(self._ip_attempts[client_ip], now)
        return len(self._ip_attempts[client_ip])


# Global rate limiter instance
join_code_rate_limiter = JoinCodeRateLimiter(
    max_failures=5, ip_max_failures=10, window_seconds=3600
)
