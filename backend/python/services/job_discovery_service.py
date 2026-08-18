import uuid
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.supabase_repo import db_helper
from backend.python.services.job_normalization_service import job_normalization_service
from backend.python.services.job_deduplication_service import job_deduplication_service
from backend.python.services.job_scoring_service import job_scoring_service

class JobDiscoveryService:
    """
    Orchestrates job discovery across multiple configured sources,
    normalizes payloads, calculates ATS scores, and persists to PostgreSQL.
    """

    def __init__(self):
        self.repo = job_repository

    async def scan_greenhouse_api(self, board_token: str = "figma") -> List[Dict[str, Any]]:
        # Mock/Real Greenhouse job board fetcher
        return [
            {
                "source_job_id": f"gh-{board_token}-501",
                "title": "Lead UI Platform Architect",
                "company": board_token.capitalize(),
                "location": "Remote - US / Global",
                "location_type": "Remote",
                "employment_type": "Full-time",
                "salary": "$175,000 - $225,000",
                "description": "We are seeking a Lead UI Platform Architect to scale our micro frontend ecosystem and design system architecture for enterprise tools.",
                "requirements": "10+ years experience in React, TypeScript, Webpack Module Federation, state management, and web performance optimization.",
                "apply_url": f"https://boards.greenhouse.io/{board_token}/jobs/501",
                "portal_type": "greenhouse"
            }
        ]

    async def scan_lever_api(self, company_name: str = "stripe") -> List[Dict[str, Any]]:
        return [
            {
                "source_job_id": f"lev-{company_name}-302",
                "title": "Principal Frontend Engineer - Micro Frontends",
                "company": company_name.capitalize(),
                "location": "Remote",
                "location_type": "Remote",
                "employment_type": "Full-time",
                "salary": "$180,000 - $230,000",
                "description": "Lead the modernization of frontend applications across global commerce suites utilizing micro frontend federation.",
                "requirements": "Strong mastery of React, TypeScript, Next.js, architecture leadership, and mentoring high-velocity engineering pods.",
                "apply_url": f"https://jobs.lever.co/{company_name}/302",
                "portal_type": "lever"
            }
        ]

    async def scan_linkedin_source(self, query: str = "Lead Frontend Architect") -> List[Dict[str, Any]]:
        return [
            {
                "source_job_id": "li-ent-9011",
                "title": "Staff Micro Frontend Architect",
                "company": "FinTech Dynamics Global",
                "location": "Remote / Hybrid",
                "location_type": "Remote",
                "employment_type": "Full-time",
                "salary": "$160,000 - $210,000",
                "description": "Looking for a Staff Micro Frontend Architect with 12+ years of enterprise JavaScript/TypeScript and distributed frontend systems experience.",
                "requirements": "Deep expertise in Module Federation, React 19, TypeScript, GraphQL, automated CI/CD and Core Web Vitals optimization.",
                "apply_url": "https://www.linkedin.com/jobs/view/90112345",
                "portal_type": "linkedin"
            },
            {
                "source_job_id": "li-ent-9012",
                "title": "Director of UI Engineering",
                "company": "NextGen AI Platform",
                "location": "San Francisco, CA (Hybrid)",
                "location_type": "Hybrid",
                "employment_type": "Full-time",
                "salary": "$200,000 - $260,000",
                "description": "Lead our AI studio UI engineering initiatives.",
                "requirements": "React, TypeScript, AI integrations.",
                "apply_url": "https://www.linkedin.com/jobs/view/90112346",
                "portal_type": "linkedin"
            }
        ]

    async def scan_workday_source(self) -> List[Dict[str, Any]]:
        # Example of a protected Workday career portal requiring manual review
        return [
            {
                "source_job_id": "wd-sec-4099",
                "title": "Principal UI Architect - Cloud Solutions",
                "company": "Oracle Enterprise",
                "location": "Remote",
                "location_type": "Remote",
                "description": "Lead architecture for cloud portal user experiences.",
                "requirements": "React, Micro Frontends, System Architecture.",
                "apply_url": "https://oracle.myworkdayjobs.com/careers/job/4099",
                "portal_type": "workday",
                "status": "MANUAL_REQUIRED", # Anti-bot/SSO protected by design
                "manual_reason": "Workday SSO & CAPTCHA protection detected - human application required"
            }
        ]

    async def run_discovery_pipeline(self, target_role: str = "Lead Frontend Architect", triggered_by: str = "CLOUD_SCHEDULER") -> Dict[str, Any]:
        run_id = f"run-{uuid.uuid4().hex[:10]}"
        print(f"[JOB_DISCOVERY] Starting discovery run {run_id} triggered by {triggered_by}...")

        # 1. Observability: Record start of automation run
        self.repo.create_automation_run(run_id, "DAILY_JOB_DISCOVERY", triggered_by)

        settings = db_helper.get_automation_settings()
        profile = db_helper.get_user_profile()
        min_threshold = settings.get("min_ats_score_threshold", 80.0)
        blacklisted_companies = [c.lower() for c in settings.get("blacklisted_companies", [])]
        blacklisted_keywords = [k.lower() for k in settings.get("blacklisted_keywords", [])]

        raw_candidates: List[Dict[str, Any]] = []

        # 2. Gather from all sources with non-blocking error isolation
        sources = [
            ("greenhouse", self.scan_greenhouse_api("figma")),
            ("lever", self.scan_lever_api("stripe")),
            ("linkedin", self.scan_linkedin_source(target_role)),
            ("workday", self.scan_workday_source())
        ]

        for source_name, task in sources:
            try:
                results = await task
                for item in results:
                    raw_candidates.append((source_name, item))
            except Exception as e:
                print(f"[JOB_DISCOVERY] Source {source_name} failed: {e}. Continuing remaining sources...")

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
                desc_text = (raw.get("description") or "").lower()

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
                    # Persist initial job record
                    saved_job = self.repo.save_job(norm_job)
                    job_id = saved_job["id"]
                    norm_job["id"] = job_id

                # ATS Scoring via Gemini / AI Provider
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
            "jobs_found": jobs_found,
            "jobs_scored": jobs_scored,
            "jobs_failed": jobs_failed,
            "jobs": persisted_jobs
        }

job_discovery_service = JobDiscoveryService()
