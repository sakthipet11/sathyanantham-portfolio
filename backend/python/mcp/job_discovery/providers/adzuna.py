"""
Adzuna Provider — Configuration-gated, requires API credentials.

API docs: https://developer.adzuna.com/overview
Requires ADZUNA_APP_ID and ADZUNA_API_KEY from environment.

This provider is DISABLED by default until credentials are configured.
It will never silently fake data.
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

logger = logging.getLogger("job_discovery.providers.adzuna")


class AdzunaProvider(JobProvider):
    """
    Adzuna job aggregator provider.

    Requires:
      - JOB_DISCOVERY_ADZUNA_APP_ID
      - JOB_DISCOVERY_ADZUNA_API_KEY

    Will NOT return any data if credentials are missing — never fakes results.
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(name="adzuna", config=config)
        self.base_url = config.base_url or "https://api.adzuna.com/v1/api"
        self.app_id = config.api_id
        self.api_key = config.api_key
        self.country = config.extra.get("country", "us")

    def _check_credentials(self) -> bool:
        return bool(self.app_id) and bool(self.api_key)

    def _get_status_message(self) -> Optional[str]:
        if not self._check_credentials():
            return (
                "Adzuna requires API credentials. Set JOB_DISCOVERY_ADZUNA_APP_ID "
                "and JOB_DISCOVERY_ADZUNA_API_KEY in your .env file. "
                "Get credentials at https://developer.adzuna.com/"
            )
        return super()._get_status_message()

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 50,
        **kwargs: Any,
    ) -> List[NormalizedJob]:
        """Search Adzuna for jobs."""
        if not self._check_credentials():
            logger.warning("Adzuna: skipped — missing API credentials")
            return []

        page = 1
        results_per_page = min(limit, 50)
        url = f"{self.base_url}/jobs/{self.country}/search/{page}"

        params = {
            "app_id": self.app_id,
            "app_key": self.api_key,
            "results_per_page": results_per_page,
            "what": query,
            "content-type": "application/json",
        }

        if location:
            params["where"] = location
        if remote_only:
            params["what_or"] = f"{query} remote"

        logger.info(f"Adzuna: searching query='{query}' country={self.country}")

        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        raw_jobs = data.get("results", [])
        logger.info(f"Adzuna: received {len(raw_jobs)} results (total: {data.get('count', 0)})")

        normalized: List[NormalizedJob] = []
        for raw in raw_jobs[:limit]:
            try:
                job = self._normalize_job(raw)
                if job:
                    normalized.append(job)
            except Exception as e:
                logger.warning(f"Adzuna: normalize error: {e}")
                continue

        return normalized

    async def get_job(self, job_id: str) -> Optional[NormalizedJob]:
        """Fetch a single job by Adzuna ID — not directly supported, returns None."""
        logger.info(f"Adzuna: get_job({job_id}) — single-job lookup not supported via API")
        return None

    async def health_check(self) -> bool:
        """Verify Adzuna API is reachable with valid credentials."""
        if not self._check_credentials():
            logger.warning("Adzuna: health check SKIPPED — no credentials")
            return False
        try:
            url = f"{self.base_url}/jobs/{self.country}/search/1"
            params = {
                "app_id": self.app_id,
                "app_key": self.api_key,
                "results_per_page": 1,
                "what": "software engineer",
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                if data.get("results") and len(data["results"]) > 0:
                    logger.info("Adzuna: health check PASSED")
                    return True
                return False
        except Exception as e:
            logger.error(f"Adzuna: health check FAILED: {e}")
            return False

    def _normalize_job(self, raw: dict) -> Optional[NormalizedJob]:
        """Convert Adzuna API job to NormalizedJob."""
        title = (raw.get("title") or "").strip()
        company = (raw.get("company", {}).get("display_name") or "").strip()
        if not title or not company:
            return None

        description = raw.get("description") or ""
        description = re.sub(r'<[^>]+>', ' ', description)
        description = re.sub(r'\s+', ' ', description).strip()

        location_raw = raw.get("location", {}).get("display_name") or ""
        location_type = LocationType.ONSITE
        if any(kw in f"{title} {description} {location_raw}".lower() for kw in ["remote", "work from home"]):
            location_type = LocationType.REMOTE
        elif "hybrid" in f"{title} {description} {location_raw}".lower():
            location_type = LocationType.HYBRID

        salary_min = raw.get("salary_min")
        salary_max = raw.get("salary_max")

        contract_type = (raw.get("contract_type") or "").lower()
        emp_type = EmploymentType.FULL_TIME
        if "part" in contract_type:
            emp_type = EmploymentType.PART_TIME
        elif "contract" in contract_type:
            emp_type = EmploymentType.CONTRACT

        apply_url = raw.get("redirect_url") or ""
        if not apply_url:
            return None

        posted_date = raw.get("created") or ""
        if posted_date:
            try:
                posted_date = posted_date[:10]
            except (TypeError, IndexError):
                posted_date = None

        category = raw.get("category", {}).get("label") or ""

        return NormalizedJob(
            source="adzuna",
            source_job_id=str(raw.get("id", "")),
            title=title,
            company=company,
            location=location_raw or "Not specified",
            location_type=location_type,
            employment_type=emp_type,
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency="USD",
            description_raw=description or f"{title} at {company}",
            tech_stack=[],
            job_url=apply_url,
            apply_url=apply_url,
            portal_type="adzuna",
            status=JobStatus.DISCOVERED,
            posted_date=posted_date,
            discovered_at=datetime.utcnow().isoformat(),
            provider_metadata={
                "category": category,
                "adzuna_id": raw.get("id"),
                "contract_time": raw.get("contract_time"),
            },
        )
