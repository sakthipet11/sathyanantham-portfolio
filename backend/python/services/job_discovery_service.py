import os
import uuid
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.supabase_repo import db_helper
from backend.python.services.job_normalization_service import job_normalization_service
from backend.python.services.job_deduplication_service import job_deduplication_service
from backend.python.services.job_scoring_service import job_scoring_service


class JobDiscoveryService:
    """
    Automated Job Discovery & Matching Platform:
    1. Discovers live jobs via JSearch / Google for Jobs MCP provider.
    2. Filters based on User Settings (Locations, Remote preference, Target roles, Recency).
    3. AI Matching Agent:
       - Profile Match (Profile ↔ Job ATS >= 75%)
       - JD Match (Reference JD ↔ Job Match >= 50%)
    """

    def __init__(self):
        self.repo = job_repository
        self._mcp_initialized = False
        self._cron_task = None
        # self.start_cron_scheduler()

    def start_cron_scheduler(self):
        """Start background loop that triggers daily discovery according to user's Daily Schedule & Limit."""
        if getattr(self, "_cron_task", None) is not None:
            return
        
        async def _scheduler_loop():
            import re
            print("[JOB_DISCOVERY] Background Cron Scheduler active.")
            last_run_date = None
            while True:
                try:
                    await asyncio.sleep(60)  # Check every 60s
                    settings = db_helper.get_automation_settings()
                    schedule_str = (settings.get("daily_schedule_time") or "08:00 AM IST").upper()
                    daily_limit = int(settings.get("daily_application_limit", 50))
                    
                    match = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM)?', schedule_str)
                    if match:
                        hr = int(match.group(1))
                        mn = int(match.group(2))
                        ampm = match.group(3)
                        if ampm == "PM" and hr < 12:
                            hr += 12
                        elif ampm == "AM" and hr == 12:
                            hr = 0

                        now = datetime.now()
                        current_date_str = now.strftime("%Y-%m-%d")
                        if now.hour == hr and now.minute == mn and last_run_date != current_date_str:
                            last_run_date = current_date_str
                            print(f"[JOB_DISCOVERY CRONJOB] Triggering automated daily discovery run at {schedule_str} (Limit: {daily_limit})")
                            await self.run_discovery_pipeline(triggered_by="CRONJOB_SCHEDULER", limit=daily_limit)
                except Exception as err:
                    print(f"[JOB_DISCOVERY CRONJOB] Scheduler error: {err}")

        try:
            loop = asyncio.get_running_loop()
            self._cron_task = loop.create_task(_scheduler_loop())
        except Exception:
            pass

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

            initialize_providers()
            for provider in provider_registry.get_all():
                rate_limiter.configure_provider(
                    provider.name,
                    provider.config.rate_limit_rpm,
                )

            self._mcp_initialized = True
            print(f"[JOB_DISCOVERY] MCP initialized: {provider_registry.enabled_count} providers active")
        except Exception as e:
            print(f"[JOB_DISCOVERY] MCP initialization error: {e}")
            self._mcp_initialized = False

    # ── Multi-Portal Live Search ─────────────────────────────────────────

    async def discover_jobs(
        self,
        queries: List[str],
        locations: Optional[List[str]] = None,
        remote_preference: str = "Local + Remote",
        recency_hours: int = 24,
        limit_per_query: int = 30,
        employment_types: Optional[List[str]] = None,
    ) -> List[Tuple[str, Dict[str, Any]]]:
        """
        Queries JSearch MCP with a SINGLE combined query string combining target roles and target locations.
        Optimized for API rate limit efficiency (1 request per discovery run).
        """
        self._ensure_mcp()
        if not self._mcp_initialized:
            print("[JOB_DISCOVERY] MCP discovery engine unavailable")
            return []

        from backend.python.mcp.job_discovery.models.search_params import JobSearchParams

        raw_candidates: List[Tuple[str, Dict[str, Any]]] = []
        remote_pref_clean = (remote_preference or "Local + Remote").lower()
        is_remote_only = remote_pref_clean == "remote"
        
        # Calculate date cutoff for recency
        cutoff_date = (datetime.utcnow() - timedelta(hours=recency_hours)).strftime("%Y-%m-%d")

        # Map recency_hours to JSearch API date_posted string
        if recency_hours <= 24:
            date_posted_str = "today"
        elif recency_hours <= 72:
            date_posted_str = "3days"
        elif recency_hours <= 168:
            date_posted_str = "week"
        elif recency_hours <= 720:
            date_posted_str = "month"
        else:
            date_posted_str = "all"

        # Format employment types if provided
        emp_type_str = ", ".join(employment_types) if employment_types else None

        # ── COMBINE ROLES & LOCATIONS INTO 1 UNIFIED QUERY STRING ───────────────
        unique_queries = list(dict.fromkeys(queries))[:3]  # Take top 3 target roles
        combined_roles_str = " OR ".join(unique_queries) if len(unique_queries) > 1 else (unique_queries[0] if unique_queries else "Software Engineer")

        target_locations = [loc for loc in (locations or []) if loc and loc.strip() and loc.strip().lower() not in ("remote", "anywhere", "all")]
        combined_location_str = ", ".join(target_locations) if target_locations else None

        if remote_pref_clean == "remote":
            combined_location_str = None
            is_remote_only = True
        elif remote_pref_clean == "local + remote" and combined_location_str:
            combined_location_str = f"{combined_location_str} or Remote"

        print(f"[JOB_DISCOVERY] Executing 1 SINGLE JSearch API call for query: '{combined_roles_str}' (location: {combined_location_str})")

        try:
            params = JobSearchParams(
                query=combined_roles_str,
                location=combined_location_str,
                remote_only=is_remote_only,
                recency_hours=recency_hours,
                date_posted=date_posted_str,
                employment_type=emp_type_str,
                limit=limit_per_query * 2,
            )
            result = await asyncio.wait_for(self._search_service.search(params), timeout=15.0)

            for job in result.jobs:
                # Recency check
                job_posted = job.posted_date or datetime.utcnow().strftime("%Y-%m-%d")
                if job_posted < cutoff_date:
                    continue

                # Location / remote check
                if remote_pref_clean == "local":
                    if job.location_type.value == "remote":
                        continue
                elif remote_pref_clean == "remote":
                    if job.location_type.value not in ("remote", "unspecified"):
                        continue

                job_dict = job.to_repository_dict()
                job_dict["source_job_id"] = job.source_job_id
                job_dict["published_time"] = job.posted_date or f"{recency_hours}h ago"
                raw_candidates.append((job.source, job_dict))
        except Exception as e:
            print(f"[JOB_DISCOVERY] JSearch MCP single search error/timeout: {e}")

        print(f"[JOB_DISCOVERY] Single API call gathered {len(raw_candidates)} total candidates")
        return raw_candidates

    # ── Use Case 1: Daily Profile Search Pipeline (ATS >= 75%) ───────────

    async def run_discovery_pipeline(
        self,
        target_role: Optional[str] = None,
        triggered_by: str = "CLOUD_SCHEDULER",
        limit: int = 30
    ) -> Dict[str, Any]:
        """
        Daily Scheduled Job Discovery:
        Load User Settings → Search configured locations & Remote → Search configured roles →
        Recency filter → Deduplication → AI Matching (Profile ↔ Job) → ATS >= 75% → Store & HUD.
        """
        run_id = f"run-{uuid.uuid4().hex[:10]}"
        print(f"[JOB_DISCOVERY] Starting daily discovery run {run_id} ({triggered_by})")

        self.repo.create_automation_run(run_id, "DAILY_JOB_DISCOVERY", triggered_by)

        settings = db_helper.get_automation_settings()
        profile = db_helper.get_user_profile()

        # Config extraction
        locations = settings.get("target_locations") or ["Coimbatore", "Bangalore", "Chennai", "India"]
        remote_pref = settings.get("remote_preference") or "Local + Remote"
        roles = settings.get("target_roles") or settings.get("target_titles") or ["Senior UI Developer", "React Developer", "Lead Software Engineer", "AI Engineer"]
        if target_role:
            roles = [target_role] + [r for r in roles if r != target_role]

        daily_limit = int(settings.get("daily_application_limit", 10))
        recency_hours = int(settings.get("job_recency_hours", 24))
        emp_types = settings.get("employment_types")
        min_threshold = float(settings.get("profile_ats_threshold") or settings.get("min_ats_score_threshold", 75.0))
        blacklisted_companies = [c.lower() for c in settings.get("blacklisted_companies", [])]
        blacklisted_keywords = [k.lower() for k in settings.get("blacklisted_keywords", [])]

        # 1. Fetch raw candidates via JSearch MCP
        raw_candidates = await self.discover_jobs(
            queries=roles,
            locations=locations,
            remote_preference=remote_pref,
            recency_hours=recency_hours,
            limit_per_query=max(daily_limit // max(len(roles), 1), 10),
            employment_types=emp_types,
        )

        jobs_found = len(raw_candidates)
        jobs_scored = 0
        jobs_qualified = 0
        jobs_failed = 0
        persisted_jobs = []

        # 2. Process, Normalize, Deduplicate, Score and Persist each job concurrently
        async def _process_single_candidate(source_name: str, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            nonlocal jobs_scored, jobs_qualified, jobs_failed
            try:
                company_name = (raw.get("company") or "").lower()
                title_name = (raw.get("title") or "").lower()
                desc_text = (raw.get("description") or raw.get("description_raw") or "").lower()

                if any(bc in company_name for bc in blacklisted_companies):
                    return None

                if any(bk in f"{title_name} {desc_text}" for bk in blacklisted_keywords):
                    return None

                norm_job = job_normalization_service.normalize(raw, source=source_name)
                norm_job["match_type"] = "PROFILE_MATCH"
                norm_job["published_time"] = raw.get("published_time") or "24h ago"

                is_dup, idempotency_key, existing_job = job_deduplication_service.is_duplicate(norm_job)
                norm_job["idempotency_key"] = idempotency_key

                if is_dup:
                    job_id = existing_job["id"]
                    norm_job["id"] = job_id
                else:
                    saved_job = self.repo.save_job(norm_job)
                    job_id = saved_job["id"]
                    norm_job["id"] = job_id

                score_data = await job_scoring_service.score_job(norm_job, profile)
                score_data["job_id"] = job_id
                score_data["match_type"] = "PROFILE_MATCH"
                self.repo.save_job_score(score_data)
                jobs_scored += 1

                overall_score = float(score_data.get("overall_score", 0.0))
                norm_job["match_score"] = overall_score
                norm_job["score_details"] = score_data

                if norm_job.get("status") == "MANUAL_REQUIRED":
                    current_status = "MANUAL_REQUIRED"
                elif overall_score >= min_threshold:
                    current_status = "QUALIFIED"
                    jobs_qualified += 1
                else:
                    current_status = "REJECTED"

                self.repo.update_job_status(job_id, current_status)
                norm_job["status"] = current_status
                return norm_job
            except Exception as item_err:
                print(f"[JOB_DISCOVERY] Candidate processing error: {item_err}")
                jobs_failed += 1
                return None

        # Execute candidate processing concurrently (batch bounded by daily_limit)
        candidate_batch_size = max(daily_limit * 2, 20)
        tasks = [_process_single_candidate(s, r) for s, r in raw_candidates[:candidate_batch_size]]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, dict):
                persisted_jobs.append(r)

        # 3. Observability
        self.repo.complete_automation_run(
            run_id=run_id,
            processed=jobs_found,
            succeeded=jobs_scored,
            failed=jobs_failed,
            error_summary=f"{jobs_failed} errors during cycle" if jobs_failed else "All jobs processed cleanly"
        )

        return {
            "run_id": run_id,
            "status": "success",
            "discovery_mode": "DAILY_PROFILE_SEARCH",
            "jobs_found": jobs_found,
            "jobs_scored": jobs_scored,
            "jobs_qualified": jobs_qualified,
            "threshold_used": min_threshold,
            "daily_application_limit": daily_limit,
            "daily_schedule_time": settings.get("daily_schedule_time", "08:00 AM IST"),
            "jobs": persisted_jobs[:daily_limit]
        }

    # ── Use Case 2: JD-Based Search Pipeline (Match >= 50%) ──────────────

    async def search_jobs_by_jd(
        self,
        jd_text: str,
        custom_threshold: Optional[float] = None,
        limit: int = 30
    ) -> Dict[str, Any]:
        """
        Search Jobs Using a Reference Job Description:
        Extract skills/role → Search job sources via MCP → Apply location & remote settings →
        AI compares Reference JD ↔ Discovered Jobs → Match score >= 50% → Return sorted list.
        """
        run_id = f"jd-run-{uuid.uuid4().hex[:10]}"
        print(f"[JOB_DISCOVERY] Starting JD-based search run {run_id}")

        settings = db_helper.get_automation_settings()
        reqs = job_scoring_service.extract_jd_requirements(jd_text)

        threshold = custom_threshold or float(settings.get("jd_match_threshold", 50.0))
        locations = settings.get("target_locations") or ["Coimbatore", "Bangalore", "Chennai", "India"]
        remote_pref = settings.get("remote_preference") or "Local + Remote"
        recency_hours = int(settings.get("job_recency_hours", 72))

        # Build search queries from extracted requirements
        queries = [reqs["target_role"]]
        if reqs.get("primary_skills"):
            queries.append(f"{reqs['target_role']} {' '.join(reqs['primary_skills'][:2])}")

        # 1. Fetch raw candidates via MCP
        raw_candidates = await self.discover_jobs(
            queries=queries,
            locations=locations,
            remote_preference=remote_pref,
            recency_hours=recency_hours,
            limit_per_query=max(limit // len(queries), 8),
            employment_types=settings.get("employment_types"),
        )

        matching_jobs = []
        jobs_scored = 0

        # 2. Score each candidate against reference JD concurrently
        async def _score_jd_candidate(source_name: str, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            nonlocal jobs_scored
            try:
                norm_job = job_normalization_service.normalize(raw, source=source_name)
                norm_job["match_type"] = "JD_MATCH"
                norm_job["reference_jd_summary"] = reqs["raw_summary"]

                is_dup, idempotency_key, existing_job = job_deduplication_service.is_duplicate(norm_job)
                norm_job["idempotency_key"] = idempotency_key

                if is_dup:
                    job_id = existing_job["id"]
                    norm_job["id"] = job_id
                else:
                    saved_job = self.repo.save_job(norm_job)
                    job_id = saved_job["id"]
                    norm_job["id"] = job_id

                score_data = await job_scoring_service.score_job_against_jd(norm_job, jd_text, reqs)
                score_data["job_id"] = job_id
                score_data["match_type"] = "JD_MATCH"
                self.repo.save_job_score(score_data)
                jobs_scored += 1

                overall_score = float(score_data.get("overall_score", 0.0))
                norm_job["match_score"] = overall_score
                norm_job["score_details"] = score_data

                if overall_score >= threshold:
                    norm_job["status"] = "QUALIFIED"
                    self.repo.update_job_status(job_id, "QUALIFIED")
                    return norm_job
                else:
                    norm_job["status"] = "REJECTED"
                    self.repo.update_job_status(job_id, "REJECTED")
                    return None
            except Exception as e:
                print(f"[JOB_DISCOVERY] JD matching candidate error: {e}")
                return None

        tasks = [_score_jd_candidate(s, r) for s, r in raw_candidates[:15]]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, dict):
                matching_jobs.append(r)

        # 3. Sort descending by match score
        matching_jobs.sort(key=lambda j: j.get("match_score", 0.0), reverse=True)

        return {
            "run_id": run_id,
            "status": "success",
            "extracted_requirements": reqs,
            "jobs_searched": len(raw_candidates),
            "jobs_scored": jobs_scored,
            "matching_jobs_count": len(matching_jobs),
            "threshold_used": threshold,
            "jobs": matching_jobs[:limit]
        }


job_discovery_service = JobDiscoveryService()
