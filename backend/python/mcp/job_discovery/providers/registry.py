"""
Provider Registry — auto-discovers and manages all job providers.

Providers register themselves here. The search service queries the registry
to get all enabled providers, and the health endpoint reports on all of them.
"""

import logging
from typing import Dict, List, Optional
from backend.python.mcp.job_discovery.providers.base import JobProvider
from backend.python.mcp.job_discovery.config import settings

logger = logging.getLogger("job_discovery.registry")


class ProviderRegistry:
    """
    Central registry of all job providers.

    Providers are added via register(). The registry handles:
    - Filtering to enabled-only providers
    - Provider lookup by name
    - Health status aggregation
    """

    def __init__(self):
        self._providers: Dict[str, JobProvider] = {}

    def register(self, provider: JobProvider) -> None:
        """Register a provider instance."""
        self._providers[provider.name] = provider
        status = "enabled" if provider.enabled else "disabled (missing credentials or config)"
        logger.info(f"Registered provider '{provider.name}' — {status}")

    def get(self, name: str) -> Optional[JobProvider]:
        """Get a provider by name, only if enabled."""
        provider = self._providers.get(name)
        if provider and provider.enabled:
            return provider
        return None

    def get_all(self) -> List[JobProvider]:
        """Get all registered providers (including disabled)."""
        return list(self._providers.values())

    def get_enabled(self) -> List[JobProvider]:
        """Get only enabled providers."""
        return [p for p in self._providers.values() if p.enabled]

    def get_by_names(self, names: List[str]) -> List[JobProvider]:
        """Get specific providers by name, only if enabled."""
        return [
            p for name in names
            if (p := self._providers.get(name)) and p.enabled
        ]

    @property
    def enabled_count(self) -> int:
        return len(self.get_enabled())

    @property
    def total_count(self) -> int:
        return len(self._providers)


# ── Singleton Registry ───────────────────────────────────────────────────────

provider_registry = ProviderRegistry()


def initialize_providers() -> ProviderRegistry:
    """
    Initialize all providers from configuration and register them.

    Called once at server startup. Each provider is independently configured
    and independently failing — a missing API key for Adzuna does not prevent
    Remotive from being registered.
    """
    # Import providers here to avoid circular imports
    from backend.python.mcp.job_discovery.providers.remotive import RemotiveProvider
    from backend.python.mcp.job_discovery.providers.himalayas import HimalayasProvider
    from backend.python.mcp.job_discovery.providers.linkedin import LinkedInProvider
    from backend.python.mcp.job_discovery.providers.remoteok import RemoteOKProvider
    from backend.python.mcp.job_discovery.providers.arbeitnow import ArbeitnowProvider
    from backend.python.mcp.job_discovery.providers.themuse import TheMuseProvider
    from backend.python.mcp.job_discovery.providers.adzuna import AdzunaProvider
    from backend.python.mcp.job_discovery.providers.greenhouse import GreenhouseProvider
    from backend.python.mcp.job_discovery.providers.lever import LeverProvider

    providers_to_register = [
        ("remotive", RemotiveProvider),
        ("himalayas", HimalayasProvider),
        ("linkedin", LinkedInProvider),
        ("remoteok", RemoteOKProvider),
        ("arbeitnow", ArbeitnowProvider),
        ("themuse", TheMuseProvider),
        ("adzuna", AdzunaProvider),
        ("greenhouse", GreenhouseProvider),
        ("lever", LeverProvider),
    ]

    for name, ProviderClass in providers_to_register:
        try:
            config = settings.get_provider_config(name)
            provider = ProviderClass(config=config)
            provider_registry.register(provider)
        except Exception as e:
            logger.error(f"Failed to initialize provider '{name}': {e}")

    logger.info(
        f"Provider initialization complete: "
        f"{provider_registry.enabled_count}/{provider_registry.total_count} enabled"
    )
    return provider_registry
