import os
import uuid
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.supabase_repo import db_helper
from backend.python.services.job_normalization_service import job_normalization_service
from backend.python.services.job_deduplication_service import job_deduplication_service
from backend.python.services.job_scoring_service import job_scoring_service


class JobDiscoveryService:
    """
    Orchestrates real-time job discovery across configured live MCP providers
    (Remotive, Himalayas, Adzuna, Greenhouse, Lever), normalizes payloads,
    calculates ATS scores, and persists to PostgreSQL.

    100% REAL DATA ONLY — No hardcoded stubs, sample jobs, or fake records.
    """

    def __init__(self):
        self.repo = job_repository
        self._mcp_initialized = False

    def _ensure_mcp(self):
        """Lazy-initialize MCP components on first use."""
        if self._mcp_initialized:
            return
        try:
            from backend.python.mcp.job_discovery.providers.registry import initialize_providers, provider_registry
            from backend.python.mcp.job_discovery.services.cache_service import CacheService
            from backend.python.mcp.job_discovery.services.search_service import SearchService
            from backend.python.mcp.job_discovery.services.rate_limiter import rate_limiter
            from backend.python.mcp.job_discovery.config import settings

            self._provider_registry = provider_registry
            self._cache = CacheService(redis_url=settings.redis_url)
            self._search_service = SearchService(cache=self._cache)

            # Initialize providers and rate limiters
            initialize_providers()
            for provider in provider_registry.get_all():
                rate_limiter.configure_provider(
                    provider.name,
                    provider.config.rate_limit_rpm,
                )

            self._mcp_initialized = True
            print(f"[JOB_DISCOVERY] MCP initialized: {provider_registry.enabled_count} providers enabled")
        except Exception as e:
            print(f"[JOB_DISCOVERY] MCP initialization error: {e}")
            self._mcp_initialized = False

    # ── Live MCP Discovery ───────────────────────────────────────────────

    async def discover_jobs(self, target_role: str, limit: int = 20) -> List[Tuple[str, Dict[str, Any]]]:
        """
        Discover real jobs via the MCP search engine.
        Returns live job listings from external providers.
        """
        self._ensure_mcp()
        if not self._mcp_initialized:
            print("[JOB_DISCOVERY] MCP discovery engine unavailable")
            return []

        from backend.python.mcp.job_discovery.models.search_params import JobSearchParams

        raw_candidates: List[Tuple[str, Dict[str, Any]]] = []

        try:
            params = JobSearchParams(
                query=target_role,
                remote_only=False,
                limit=limit,
            )
            result = await self._search_service.search(params)

            for job in result.jobs:
                job_dict = job.to_repository_dict()
                job_dict["source_job_id"] = job.source_job_id
                raw_candidates.append((job.source, job_dict))

            print(
                f"[JOB_DISCOVERY] MCP search completed: "
                f"{result.total_results} live results from {list(result.provider_results.keys())} "
                f"({result.deduplicated_count} deduped, "
                f"{len(result.provider_errors)} provider errors)"
            )

            for err in result.provider_errors:
                print(f"[JOB_DISCOVERY] Provider '{err.provider}' notice: {err.message}")

        except Exception as e:
            print(f"[JOB_DISCOVERY] MCP search exception: {e}")
            return []

        return raw_candidates

    # ── Main Discovery Pipeline ──────────────────────────────────────────

    async def run_discovery_pipeline(
        self,
        target_role: str = "Lead Frontend Architect",
        triggered_by: str = "CLOUD_SCHEDULER",
        limit: int = 15
    ) -> Dict[str, Any]:
        run_id = f"run-{uuid.uuid4().hex[:10]}"
        print(f"[JOB_DISCOVERY] Starting discovery run {run_id} triggered by {triggered_by} — live MCP data")

        # 1. Observability: Record start of automation run
        self.repo.create_automation_run(run_id, "DAILY_JOB_DISCOVERY", triggered_by)

        settings = db_helper.get_automation_settings()
        profile = db_helper.get_user_profile()
        min_threshold = settings.get("min_ats_score_threshold", 80.0)
        blacklisted_companies = [c.lower() for c in settings.get("blacklisted_companies", [])]
        blacklisted_keywords = [k.lower() for k in settings.get("blacklisted_keywords", [])]

        # 2. Gather candidates via live MCP providers
        raw_candidates = await self.discover_jobs(target_role, limit=limit)

        jobs_found = len(raw_candidates)
        jobs_scored = 0
        jobs_failed = 0
        persisted_jobs = []

        # 3. Process, Normalize, Deduplicate, Score and Persist each job
        for source_name, raw in raw_candidates:
            try:
                # Blacklist filter checks
                company_name = (raw.get("company") or "").lower()
                title_name = (raw.get("title") or "").lower()
                desc_text = (raw.get("description") or raw.get("description_raw") or "").lower()

                if any(bc in company_name for bc in blacklisted_companies):
                    print(f"[JOB_DISCOVERY] Skipping blacklisted company: {raw.get('company')}")
                    continue

                if any(bk in f"{title_name} {desc_text}" for bk in blacklisted_keywords):
                    print(f"[JOB_DISCOVERY] Skipping job with blacklisted keyword: {raw.get('title')}")
                    continue

                # Normalization
                norm_job = job_normalization_service.normalize(raw, source=source_name)

                # Deduplication Check
                is_dup, idempotency_key, existing_job = job_deduplication_service.is_duplicate(norm_job)
                norm_job["idempotency_key"] = idempotency_key

                if is_dup:
                    print(f"[JOB_DISCOVERY] Job '{norm_job['title']}' at '{norm_job['company']}' already exists. Re-evaluating score...")
                    job_id = existing_job["id"]
                    norm_job["id"] = job_id
                else:
                    # Persist initial job record via existing repository
                    saved_job = self.repo.save_job(norm_job)
                    job_id = saved_job["id"]
                    norm_job["id"] = job_id

                # ATS Scoring via AI Provider
                score_data = await job_scoring_service.score_job(norm_job, profile)
                score_data["job_id"] = job_id
                self.repo.save_job_score(score_data)
                jobs_scored += 1

                # Lifecycle Status Transition
                if norm_job.get("status") == "MANUAL_REQUIRED":
                    current_status = "MANUAL_REQUIRED"
                elif score_data["overall_score"] >= min_threshold:
                    current_status = "QUALIFIED"
                else:
                    current_status = "REJECTED"

                self.repo.update_job_status(job_id, current_status)
                norm_job["status"] = current_status
                norm_job["score_details"] = score_data
                norm_job["match_score"] = score_data["overall_score"]
                persisted_jobs.append(norm_job)

            except Exception as item_err:
                print(f"[JOB_DISCOVERY] Error processing job candidate: {item_err}")
                jobs_failed += 1

        # 4. Complete Automation Run Record
        self.repo.complete_automation_run(
            run_id=run_id,
            processed=jobs_found,
            succeeded=jobs_scored,
            failed=jobs_failed,
            error_summary=f"{jobs_failed} errors during discovery cycle" if jobs_failed else "All jobs processed cleanly"
        )

        return {
            "run_id": run_id,
            "status": "success",
            "discovery_mode": "LIVE_MCP",
            "jobs_found": jobs_found,
            "jobs_scored": jobs_scored,
            "jobs_failed": jobs_failed,
            "jobs": persisted_jobs
        }


job_discovery_service = JobDiscoveryService()
