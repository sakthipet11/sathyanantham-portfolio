"""
Search orchestration service — concurrent provider dispatch with
exception isolation, deduplication, and result aggregation.
"""

import asyncio
import time
import logging
from typing import List, Optional, Dict, Any

from backend.python.mcp.job_discovery.models.normalized_job import NormalizedJob
from backend.python.mcp.job_discovery.models.search_params import (
    JobSearchParams,
    ProfileSearchParams,
    SearchResult,
    ProviderError,
)
from backend.python.mcp.job_discovery.providers.registry import provider_registry
from backend.python.mcp.job_discovery.services.deduplication import DeduplicationService
from backend.python.mcp.job_discovery.services.cache_service import CacheService
from backend.python.mcp.job_discovery.services.rate_limiter import rate_limiter
from backend.python.mcp.job_discovery.config import settings

logger = logging.getLogger("job_discovery.search")

# Retryable HTTP status codes
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
NON_RETRYABLE_STATUS_CODES = {400, 401, 403, 404, 405, 422}


class SearchService:
    """
    Orchestrates concurrent searches across all enabled providers.

    Key guarantees:
    - One provider failing never fails the whole search
    - Results are deduplicated across providers
    - Rate limits are enforced per-provider
    - Responses are cached per search params
    - Never returns fake/mock/hardcoded data
    """

    def __init__(self, cache: CacheService):
        self.cache = cache
        self._dedup = DeduplicationService()

    async def search(self, params: JobSearchParams) -> SearchResult:
        """
        Execute a search across all (or specified) providers.

        Returns a unified SearchResult with per-provider tracking.
        """
        start_time = time.time()
        self._dedup.reset()

        # Check cache first
        cache_key_params = params.model_dump(exclude_none=True)
        cached = await self.cache.get_cached("search", cache_key_params)
        if cached:
            result = SearchResult(**cached)
            result.cached = True
            result.search_duration_ms = (time.time() - start_time) * 1000
            logger.info(f"Search cache HIT for query='{params.query}'")
            return result

        # Determine which providers to query
        if params.providers:
            providers = provider_registry.get_by_names(params.providers)
        else:
            providers = provider_registry.get_enabled()

        if not providers:
            return SearchResult(
                status="degraded",
                total_results=0,
                jobs=[],
                provider_errors=[
                    ProviderError(
                        provider="all",
                        error_type="no_providers",
                        message="No providers are enabled or available",
                    )
                ],
                search_params=cache_key_params,
                search_duration_ms=(time.time() - start_time) * 1000,
            )

        # Dispatch concurrent provider searches with timeout
        tasks = []
        provider_names = []
        for provider in providers:
            if provider.circuit_open:
                logger.warning(f"Skipping provider '{provider.name}' — circuit breaker open")
                continue
            if not rate_limiter.allow_request(provider.name):
                logger.warning(f"Skipping provider '{provider.name}' — rate limited")
                continue
            provider_names.append(provider.name)
            tasks.append(
                self._search_single_provider(
                    provider.name,
                    params,
                )
            )

        # asyncio.gather with return_exceptions=True — one failure never kills the others
        raw_results = await asyncio.gather(*tasks, return_exceptions=True)

        # Aggregate results
        all_jobs: List[NormalizedJob] = []
        provider_results: Dict[str, int] = {}
        provider_errors: List[ProviderError] = []

        for i, result in enumerate(raw_results):
            pname = provider_names[i] if i < len(provider_names) else f"unknown_{i}"
            if isinstance(result, Exception):
                provider_errors.append(
                    ProviderError(
                        provider=pname,
                        error_type=type(result).__name__,
                        message=str(result),
                        retryable=False,
                    )
                )
                # Record failure on the provider's circuit breaker
                p = provider_registry.get(pname)
                if p:
                    p.record_failure(str(result))
            elif isinstance(result, list):
                provider_results[pname] = len(result)
                all_jobs.extend(result)
                # Record success
                p = provider_registry.get(pname)
                if p:
                    p.record_success(0)  # Latency tracked in _search_single_provider

        # Deduplicate across providers
        unique_jobs, dedup_count = self._dedup.deduplicate(all_jobs)

        # Sort by relevance (simple: title match strength, then posted date)
        unique_jobs.sort(
            key=lambda j: (j.posted_date or "0000-00-00"),
            reverse=True,
        )

        # Apply limit
        if params.limit and len(unique_jobs) > params.limit:
            unique_jobs = unique_jobs[: params.limit]

        search_result = SearchResult(
            status="",  # Will be computed
            total_results=len(unique_jobs),
            jobs=unique_jobs,
            deduplicated_count=dedup_count,
            provider_results=provider_results,
            provider_errors=provider_errors,
            search_params=cache_key_params,
            search_duration_ms=(time.time() - start_time) * 1000,
        )
        search_result.status = search_result.compute_status()

        # Cache successful results
        if search_result.status in ("success", "partial") and unique_jobs:
            # Determine shortest cache TTL from responding providers
            min_ttl = 1800  # 30 min default
            for pname in provider_results:
                p = provider_registry.get(pname)
                if p and p.config.cache_ttl_seconds:
                    min_ttl = min(min_ttl, p.config.cache_ttl_seconds)
            await self.cache.set_cached(
                "search",
                cache_key_params,
                search_result.model_dump(),
                ttl_seconds=min_ttl,
            )

        duration = search_result.search_duration_ms
        logger.info(
            f"Search complete: query='{params.query}' "
            f"status={search_result.status} "
            f"results={search_result.total_results} "
            f"deduped={dedup_count} "
            f"providers={list(provider_results.keys())} "
            f"errors={[e.provider for e in provider_errors]} "
            f"duration={duration:.0f}ms"
        )

        return search_result

    async def _search_single_provider(
        self,
        provider_name: str,
        params: JobSearchParams,
    ) -> List[NormalizedJob]:
        """Search a single provider with timeout and error handling."""
        provider = provider_registry.get(provider_name)
        if not provider:
            raise RuntimeError(f"Provider '{provider_name}' not found or disabled")

        start = time.time()
        try:
            jobs = await asyncio.wait_for(
                provider.search_jobs(
                    query=params.query,
                    location=params.location,
                    remote_only=params.remote_only,
                    limit=params.limit,
                ),
                timeout=settings.concurrent_provider_timeout,
            )
            latency_ms = (time.time() - start) * 1000
            provider.record_success(latency_ms)
            logger.info(
                f"Provider '{provider_name}' returned {len(jobs)} jobs "
                f"in {latency_ms:.0f}ms"
            )
            return jobs
        except asyncio.TimeoutError:
            latency_ms = (time.time() - start) * 1000
            provider.record_failure(f"Timeout after {latency_ms:.0f}ms")
            raise
        except Exception as e:
            provider.record_failure(str(e))
            raise

    async def search_for_profile(self, params: ProfileSearchParams) -> SearchResult:
        """
        Profile-aware search: builds queries from target titles and skills,
        aggregates results, filters by blacklists.
        """
        all_jobs: List[NormalizedJob] = []
        all_errors: List[ProviderError] = []
        all_provider_results: Dict[str, int] = {}
        start_time = time.time()

        # Search for each target title
        for title in params.target_titles[:5]:  # Cap at 5 to prevent abuse
            for location in params.target_locations[:3]:
                search_params = JobSearchParams(
                    query=title,
                    location=location,
                    remote_only=(location.lower() == "remote"),
                    providers=params.providers,
                    limit=min(params.limit, 50),
                )
                result = await self.search(search_params)
                all_jobs.extend(result.jobs)
                all_errors.extend(result.provider_errors)
                for k, v in result.provider_results.items():
                    all_provider_results[k] = all_provider_results.get(k, 0) + v

        # Apply blacklist filters
        blacklisted_companies_lower = [c.lower() for c in params.blacklisted_companies]
        blacklisted_keywords_lower = [k.lower() for k in params.blacklisted_keywords]

        filtered_jobs = []
        for job in all_jobs:
            company_lower = job.company.lower()
            if any(bc in company_lower for bc in blacklisted_companies_lower):
                continue
            title_desc = f"{job.title} {job.description_raw}".lower()
            if any(bk in title_desc for bk in blacklisted_keywords_lower):
                continue
            filtered_jobs.append(job)

        # Deduplicate the aggregated results
        self._dedup.reset()
        unique_jobs, dedup_count = self._dedup.deduplicate(filtered_jobs)

        # Apply salary filter if specified
        if params.min_salary:
            unique_jobs = [
                j for j in unique_jobs
                if j.salary_max is None or j.salary_max >= params.min_salary
            ]

        # Apply final limit
        unique_jobs = unique_jobs[: params.limit]

        search_result = SearchResult(
            total_results=len(unique_jobs),
            jobs=unique_jobs,
            deduplicated_count=dedup_count,
            provider_results=all_provider_results,
            provider_errors=all_errors,
            search_params=params.model_dump(exclude_none=True),
            search_duration_ms=(time.time() - start_time) * 1000,
        )
        search_result.status = search_result.compute_status()
        return search_result
