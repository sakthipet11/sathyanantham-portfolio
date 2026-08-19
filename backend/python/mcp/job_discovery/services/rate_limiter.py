"""
Per-provider rate limiter using token bucket algorithm.

Works with both Redis (distributed) and in-memory (local dev) backends.
"""

import time
import logging
from typing import Dict, Optional

logger = logging.getLogger("job_discovery.rate_limiter")


class TokenBucket:
    """Simple in-memory token bucket rate limiter."""

    def __init__(self, capacity: int, refill_rate: float):
        """
        Args:
            capacity: Maximum tokens (requests) per window
            refill_rate: Tokens added per second
        """
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = float(capacity)
        self.last_refill = time.time()

    def consume(self, tokens: int = 1) -> bool:
        """Attempt to consume tokens. Returns True if allowed."""
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

    @property
    def wait_time(self) -> float:
        """Seconds to wait before next token is available."""
        if self.tokens >= 1:
            return 0.0
        return (1 - self.tokens) / self.refill_rate


class RateLimiter:
    """
    Per-provider rate limiter manager.

    Each provider gets its own token bucket based on its configured RPM
    (requests per minute). The limiter enforces this before any API call
    is made, preventing provider bans and respecting their terms.
    """

    def __init__(self):
        self._buckets: Dict[str, TokenBucket] = {}

    def configure_provider(self, provider_name: str, requests_per_minute: int) -> None:
        """Set up a rate limiter for a provider."""
        refill_rate = requests_per_minute / 60.0  # tokens per second
        self._buckets[provider_name] = TokenBucket(
            capacity=requests_per_minute,
            refill_rate=refill_rate,
        )
        logger.info(
            f"Rate limiter configured for '{provider_name}': "
            f"{requests_per_minute} RPM"
        )

    def allow_request(self, provider_name: str) -> bool:
        """
        Check if a request to the provider is allowed.
        Returns True if within rate limit, False if rate-limited.
        """
        bucket = self._buckets.get(provider_name)
        if bucket is None:
            # No limiter configured — allow by default
            return True
        return bucket.consume()

    def wait_time(self, provider_name: str) -> float:
        """Get seconds to wait before next request is allowed."""
        bucket = self._buckets.get(provider_name)
        if bucket is None:
            return 0.0
        return bucket.wait_time

    def is_rate_limited(self, provider_name: str) -> bool:
        """Check if provider is currently rate-limited without consuming a token."""
        bucket = self._buckets.get(provider_name)
        if bucket is None:
            return False
        return bucket.tokens < 1


# Singleton
rate_limiter = RateLimiter()
