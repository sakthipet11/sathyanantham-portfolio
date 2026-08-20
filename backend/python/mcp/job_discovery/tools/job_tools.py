"""
MCP Tool Definitions — All 10 tools for the Job Discovery MCP Server.

These are the MCP-protocol tools exposed to MCP clients (the existing
job_discovery_service or any other MCP-compatible agent).

Tools are pure dispatchers — they validate input, call services, and
return results. No provider-specific logic lives here.

OWNERSHIP NOTE: save_job is INERT by default. The existing job_repository
owns persistence. This tool exists for API completeness but is not called
in the default integration path. See Phase 0 Ownership Decision Record.
"""

import logging
from typing import Any, Dict, List, Optional

from backend.python.mcp.job_discovery.models import (
    NormalizedJob,
    JobSearchParams,
    ProfileSearchParams,
    CompanySearchParams,
    SearchResult,
    ProviderHealthStatus,
    HealthCheckResult,
)
from backend.python.mcp.job_discovery.services.search_service import SearchService
from backend.python.mcp.job_discovery.services.cache_service import CacheService
from backend.python.mcp.job_discovery.providers.registry import provider_registry
from backend.python.mcp.job_discovery.middleware.security import (
    sanitize_query,
    sanitize_location,
    validate_provider_list,
)
from backend.python.mcp.job_discovery.config import settings

logger = logging.getLogger("job_discovery.tools")


class JobDiscoveryTools:
    """
    All 10 MCP tools as methods. Registered on the MCP server in server.py.
    """

    def __init__(self, search_service: SearchService, cache: CacheService):
        self.search_service = search_service
        self.cache = cache

    # ── Tool 1: search_jobs ──────────────────────────────────────────────

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        employment_type: Optional[str] = None,
        min_salary: Optional[float] = None,
        max_salary: Optional[float] = None,
        company: Optional[str] = None,
        tech_stack: Optional[List[str]] = None,
        providers: Optional[List[str]] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Search for jobs across all enabled providers."""
        params = JobSearchParams(
            query=sanitize_query(query),
            location=sanitize_location(location) if location else None,
            remote_only=remote_only,
            employment_type=employment_type,
            min_salary=min_salary,
            max_salary=max_salary,
            company=company,
            tech_stack=tech_stack,
            providers=validate_provider_list(providers) if providers else None,
            limit=min(limit, settings.max_search_limit),
            offset=offset,
        )
        result = await self.search_service.search(params)
        return result.model_dump()

    # ── Tool 2: get_job ──────────────────────────────────────────────────

    async def get_job(
        self,
        provider: str,
        job_id: str,
    ) -> Dict[str, Any]:
        """Fetch a single job by provider name and provider-specific job ID."""
        p = provider_registry.get(provider)
        if not p:
            return {
                "status": "error",
                "message": f"Provider '{provider}' not found or disabled",
            }
        try:
            job = await p.get_job(job_id)
            if job:
                return {"status": "success", "job": job.model_dump()}
            return {"status": "not_found", "message": f"Job {job_id} not found at {provider}"}
        except Exception as e:
            return {"status": "error", "provider": provider, "message": str(e)}

    # ── Tool 3: get_jobs (batch) ─────────────────────────────────────────

    async def get_jobs(
        self,
        job_ids: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Batch fetch multiple jobs. Each entry needs provider + job_id.
        Input: [{"provider": "jsearch", "job_id": "123"}, ...]
        """
        results = []
        for entry in job_ids[:50]:  # Cap at 50 per batch
            provider = entry.get("provider", "")
            jid = entry.get("job_id", "")
            result = await self.get_job(provider, jid)
            results.append(result)
        return {"status": "success", "results": results, "count": len(results)}

    # ── Tool 4: get_new_jobs ─────────────────────────────────────────────

    async def get_new_jobs(
        self,
        since_hours: int = 24,
        query: Optional[str] = None,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Get jobs posted within the last N hours."""
        search_query = query or "software engineer"
        params = JobSearchParams(
            query=sanitize_query(search_query),
            limit=min(limit, settings.max_search_limit),
        )
        result = await self.search_service.search(params)

        # Filter by posted_date (approximate — providers may not have exact timestamps)
        from datetime import datetime, timedelta
        cutoff = (datetime.utcnow() - timedelta(hours=since_hours)).strftime("%Y-%m-%d")
        new_jobs = [
            j for j in result.jobs
            if (j.posted_date or "9999-99-99") >= cutoff
        ]

        return {
            "status": result.status,
            "total_results": len(new_jobs),
            "jobs": [j.model_dump() for j in new_jobs],
            "since_hours": since_hours,
            "provider_errors": [e.model_dump() for e in result.provider_errors],
        }

    # ── Tool 5: search_jobs_for_profile ──────────────────────────────────

    async def search_jobs_for_profile(
        self,
        target_titles: Optional[List[str]] = None,
        target_locations: Optional[List[str]] = None,
        primary_skills: Optional[List[str]] = None,
        blacklisted_companies: Optional[List[str]] = None,
        blacklisted_keywords: Optional[List[str]] = None,
        min_salary: Optional[float] = None,
        providers: Optional[List[str]] = None,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Profile-aware job search with blacklist filtering."""
        params = ProfileSearchParams(
            target_titles=target_titles or ["Lead Frontend Architect", "Principal UI Platform Engineer"],
            target_locations=target_locations or ["Remote", "Hybrid"],
            primary_skills=primary_skills or [],
            blacklisted_companies=blacklisted_companies or [],
            blacklisted_keywords=blacklisted_keywords or [],
            min_salary=min_salary,
            providers=validate_provider_list(providers) if providers else None,
            limit=min(limit, settings.max_search_limit),
        )
        result = await self.search_service.search_for_profile(params)
        return result.model_dump()

    # ── Tool 6: get_provider_status ──────────────────────────────────────

    async def get_provider_status(
        self,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get health status for one or all providers."""
        if provider:
            p = provider_registry.get(provider)
            if not p:
                # Check if it exists but is disabled
                all_providers = provider_registry.get_all()
                for ap in all_providers:
                    if ap.name == provider:
                        return {"status": "success", "provider": ap.get_health_status().model_dump()}
                return {"status": "error", "message": f"Provider '{provider}' not registered"}
            return {"status": "success", "provider": p.get_health_status().model_dump()}

        statuses = [p.get_health_status().model_dump() for p in provider_registry.get_all()]
        return {
            "status": "success",
            "providers": statuses,
            "enabled_count": provider_registry.enabled_count,
            "total_count": provider_registry.total_count,
        }

    # ── Tool 7: refresh_job ──────────────────────────────────────────────

    async def refresh_job(
        self,
        provider: str,
        job_id: str,
    ) -> Dict[str, Any]:
        """Re-fetch a job from its provider to get updated data."""
        # Invalidate cache
        await self.cache.invalidate("job", {"provider": provider, "job_id": job_id})
        return await self.get_job(provider, job_id)

    # ── Tool 8: save_job ─────────────────────────────────────────────────

    async def save_job(
        self,
        job_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        INERT by default — exists for API completeness.

        The existing job_repository is the canonical persistence owner.
        This tool validates and returns the normalized job but does NOT
        write to the database unless the Phase 0 ownership decision
        explicitly assigns persistence to the MCP.

        See: Ownership Decision Record in project documentation.
        """
        try:
            job = NormalizedJob(**job_data)
            return {
                "status": "validated",
                "message": (
                    "Job validated and normalized. Persistence is handled by the "
                    "existing job_repository — this MCP tool is INERT by design. "
                    "Use job_repository.save_job() for database writes."
                ),
                "job": job.model_dump(),
            }
        except Exception as e:
            return {"status": "error", "message": f"Validation failed: {e}"}

    # ── Tool 9: health_check ─────────────────────────────────────────────

    async def health_check(self) -> Dict[str, Any]:
        """Full server health check including all providers and dependencies."""
        provider_statuses = []
        for provider in provider_registry.get_all():
            try:
                is_healthy = await provider.health_check()
                status = provider.get_health_status()
                status.healthy = is_healthy
                provider_statuses.append(status)
            except Exception as e:
                status = provider.get_health_status()
                status.healthy = False
                status.last_error = str(e)
                provider_statuses.append(status)

        cache_ok = await self.cache.health_check()

        result = HealthCheckResult(
            server_status="healthy" if any(s.healthy for s in provider_statuses) else "degraded",
            server_version=settings.server_version,
            providers=provider_statuses,
            cache_connected=cache_ok,
        )
        return result.model_dump()

    # ── Tool 10: search_companies ────────────────────────────────────────

    async def search_companies(
        self,
        company_name: str,
        include_jobs: bool = True,
    ) -> Dict[str, Any]:
        """Search for companies and optionally include their active job listings."""
        if not company_name or len(company_name) < 2:
            return {"status": "error", "message": "Company name must be at least 2 characters"}

        result: Dict[str, Any] = {
            "status": "success",
            "company": company_name,
            "jobs": [],
        }

        if include_jobs:
            params = JobSearchParams(
                query=company_name,
                company=company_name,
                limit=20,
            )
            search_result = await self.search_service.search(params)
            # Filter to jobs matching the company name
            company_lower = company_name.lower()
            matching_jobs = [
                j for j in search_result.jobs
                if company_lower in j.company.lower()
            ]
            result["jobs"] = [j.model_dump() for j in matching_jobs]
            result["total_jobs"] = len(matching_jobs)
            result["provider_errors"] = [e.model_dump() for e in search_result.provider_errors]

        return result
