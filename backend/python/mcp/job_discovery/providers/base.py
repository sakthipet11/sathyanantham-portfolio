"""
JobProvider Abstract Base Class

Provider-specific logic is encapsulated in subclasses. The MCP tool layer
never contains provider-specific code — it delegates to the registry which
dispatches to registered providers.
"""

import abc
import time
import logging
from typing import List, Optional, Dict, Any
from backend.python.mcp.job_discovery.models.normalized_job import NormalizedJob
from backend.python.mcp.job_discovery.models.search_params import ProviderHealthStatus
from backend.python.mcp.job_discovery.config import ProviderConfig

logger = logging.getLogger("job_discovery.providers")


class JobProvider(abc.ABC):
    """
    Abstract base class for all job data providers.

    Each provider must implement search_jobs(), get_job(), and health_check().
    Providers are independently toggleable, independently failing, and
    independently rate-limited.
    """

    def __init__(self, name: str, config: ProviderConfig):
        self.name = name
        self.config = config
        self._last_request_time: float = 0.0
        self._request_count_window: List[float] = []
        self._consecutive_failures: int = 0
        self._circuit_open_until: float = 0.0
        self._last_error: Optional[str] = None
        self._last_success_at: Optional[str] = None
        self._total_requests: int = 0
        self._total_errors: int = 0
        self._total_latency_ms: float = 0.0

    @property
    def enabled(self) -> bool:
        return self.config.enabled

    @property
    def circuit_open(self) -> bool:
        """Circuit breaker: open after 5 consecutive failures, reset after 60s."""
        if self._consecutive_failures >= 5:
            if time.time() < self._circuit_open_until:
                return True
            # Half-open: allow one attempt
            self._consecutive_failures = 4  # Will reset on success or re-open on failure
        return False

    def record_success(self, latency_ms: float):
        """Record a successful request."""
        from datetime import datetime
        self._consecutive_failures = 0
        self._total_requests += 1
        self._total_latency_ms += latency_ms
        self._last_success_at = datetime.utcnow().isoformat()
        self._last_error = None

    def record_failure(self, error: str):
        """Record a failed request and potentially open the circuit breaker."""
        self._consecutive_failures += 1
        self._total_requests += 1
        self._total_errors += 1
        self._last_error = error
        if self._consecutive_failures >= 5:
            self._circuit_open_until = time.time() + 60.0
            logger.warning(
                f"Circuit breaker OPEN for provider '{self.name}' "
                f"after {self._consecutive_failures} consecutive failures. "
                f"Will retry after 60s."
            )

    def check_rate_limit(self) -> bool:
        """
        Check if we're within the rate limit window.
        Returns True if request is allowed, False if rate-limited.
        """
        now = time.time()
        window_start = now - 60.0  # 1-minute sliding window
        self._request_count_window = [
            t for t in self._request_count_window if t > window_start
        ]
        if len(self._request_count_window) >= self.config.rate_limit_rpm:
            return False
        self._request_count_window.append(now)
        return True

    def get_health_status(self) -> ProviderHealthStatus:
        """Build a health status report for this provider."""
        from datetime import datetime
        avg_latency = (
            self._total_latency_ms / self._total_requests
            if self._total_requests > 0
            else None
        )
        success_rate = (
            (self._total_requests - self._total_errors) / self._total_requests * 100
            if self._total_requests > 0
            else None
        )
        return ProviderHealthStatus(
            provider=self.name,
            enabled=self.enabled,
            healthy=self.enabled and not self.circuit_open and self._last_error is None,
            last_check_at=datetime.utcnow().isoformat(),
            last_success_at=self._last_success_at,
            last_error=self._last_error,
            success_rate_1h=success_rate,
            avg_latency_ms=avg_latency,
            total_requests_1h=self._total_requests,
            rate_limited=not self.check_rate_limit(),
            credentials_configured=self._check_credentials(),
            message=self._get_status_message(),
        )

    def _check_credentials(self) -> bool:
        """Override in providers requiring API keys."""
        return True

    def _get_status_message(self) -> Optional[str]:
        """Override to provide provider-specific status messages."""
        if self.circuit_open:
            return "Circuit breaker open — provider temporarily disabled"
        if not self.enabled:
            return "Provider disabled in configuration"
        if not self._check_credentials():
            return "Missing required credentials — provider unavailable"
        return None

    @abc.abstractmethod
    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 50,
        **kwargs: Any,
    ) -> List[NormalizedJob]:
        """
        Search for jobs matching the query.

        Must return real job data from the provider's API — never hardcoded,
        mocked, or sample records. If the provider is unavailable, raise an
        exception rather than returning fake data.
        """
        ...

    @abc.abstractmethod
    async def get_job(self, job_id: str) -> Optional[NormalizedJob]:
        """
        Fetch a single job by its provider-specific ID.

        Returns None if the job no longer exists at the provider.
        """
        ...

    @abc.abstractmethod
    async def health_check(self) -> bool:
        """
        Verify the provider is reachable and returning data.

        Must make a real API call — never return True without verification.
        """
        ...
