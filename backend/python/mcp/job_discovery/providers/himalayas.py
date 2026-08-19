"""
Himalayas.app Provider — Free remote job API.

API: https://himalayas.app/jobs/api
Free tier available, returns real remote job listings.
"""

import logging
from typing import List, Optional, Any
from datetime import datetime
import re

import httpx

from backend.python.mcp.job_discovery.providers.base import JobProvider
from backend.python.mcp.job_discovery.models.normalized_job import (
    NormalizedJob,
    LocationType,
    EmploymentType,
    JobStatus,
)
from backend.python.mcp.job_discovery.config import ProviderConfig

logger = logging.getLogger("job_discovery.providers.himalayas")


class HimalayasProvider(JobProvider):
    """
    Himalayas.app remote job provider.
    Free public API returning real remote job listings.
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(name="himalayas", config=config)
        self.base_url = config.base_url or "https://himalayas.app/jobs/api"

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 50,
        **kwargs: Any,
    ) -> List[NormalizedJob]:
        """Search Himalayas for remote jobs."""
        params: dict = {"limit": min(limit, 100), "offset": 0}
        if query:
            params["search"] = query

        logger.info(f"Himalayas: searching query='{query}' limit={limit}")

        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            response = await client.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()

        raw_jobs = data.get("jobs", [])
        logger.info(f"Himalayas: received {len(raw_jobs)} raw results")

        normalized: List[NormalizedJob] = []
        for raw in raw_jobs[:limit]:
            try:
                job = self._normalize_job(raw)
                if job:
                    normalized.append(job)
            except Exception as e:
                logger.warning(f"Himalayas: failed to normalize job: {e}")
                continue

        return normalized

    async def get_job(self, job_id: str) -> Optional[NormalizedJob]:
        """Fetch a single job by Himalayas job ID."""
        try:
            url = f"https://himalayas.app/jobs/{job_id}/api"
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                response = await client.get(url)
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                data = response.json()
            return self._normalize_job(data)
        except Exception as e:
            logger.error(f"Himalayas: get_job({job_id}) failed: {e}")
            return None

    async def health_check(self) -> bool:
        """Verify Himalayas API is reachable."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self.base_url, params={"limit": 1})
                response.raise_for_status()
                data = response.json()
                if data.get("jobs") and len(data["jobs"]) > 0:
                    logger.info("Himalayas: health check PASSED")
                    return True
                return False
        except Exception as e:
            logger.error(f"Himalayas: health check FAILED: {e}")
            return False

    def _normalize_job(self, raw: dict) -> Optional[NormalizedJob]:
        """Convert Himalayas API response to NormalizedJob."""
        title = (raw.get("title") or "").strip()
        company_name = (raw.get("companyName") or raw.get("company_name") or "").strip()
        if not title or not company_name:
            return None

        description = raw.get("description") or ""
        if isinstance(description, str):
            description = re.sub(r'<[^>]+>', ' ', description)
            description = re.sub(r'\s+', ' ', description).strip()
        if len(description) > 10000:
            description = description[:10000] + "..."

        location_raw = raw.get("location") or "Worldwide"
        employment_type_str = (raw.get("type") or raw.get("employment_type") or "Full-time").strip()
        emp_type = EmploymentType.FULL_TIME
        if "part" in employment_type_str.lower():
            emp_type = EmploymentType.PART_TIME
        elif "contract" in employment_type_str.lower():
            emp_type = EmploymentType.CONTRACT

        salary_min = raw.get("salaryCurrencyMin") or raw.get("salary_min")
        salary_max = raw.get("salaryCurrencyMax") or raw.get("salary_max")
        try:
            salary_min = float(salary_min) if salary_min else None
            salary_max = float(salary_max) if salary_max else None
        except (ValueError, TypeError):
            salary_min, salary_max = None, None

        categories = raw.get("categories") or raw.get("tags") or []
        if isinstance(categories, list):
            tech_stack = [str(c) for c in categories if c]
        else:
            tech_stack = []

        posted_date = raw.get("pubDate") or raw.get("created_at") or ""
        if posted_date:
            try:
                posted_date = posted_date[:10]
            except (TypeError, IndexError):
                posted_date = None

        job_slug = raw.get("slug") or raw.get("id") or ""
        company_slug = raw.get("companySlug") or raw.get("company_slug") or ""
        apply_url = raw.get("applicationLink") or raw.get("apply_url") or ""
        if not apply_url:
            apply_url = f"https://himalayas.app/companies/{company_slug}/jobs/{job_slug}" if company_slug and job_slug else ""

        if not apply_url:
            return None

        return NormalizedJob(
            source="himalayas",
            source_job_id=str(raw.get("id") or job_slug or ""),
            title=title,
            company=company_name,
            location=location_raw,
            location_type=LocationType.REMOTE,
            employment_type=emp_type,
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency="USD",
            description_raw=description or f"{title} at {company_name}",
            tech_stack=tech_stack,
            job_url=f"https://himalayas.app/companies/{company_slug}/jobs/{job_slug}" if company_slug and job_slug else apply_url,
            apply_url=apply_url,
            portal_type="himalayas",
            status=JobStatus.DISCOVERED,
            posted_date=posted_date,
            discovered_at=datetime.utcnow().isoformat(),
            provider_metadata={
                "company_logo": raw.get("companyLogo") or raw.get("company_logo"),
                "company_slug": company_slug,
            },
        )
