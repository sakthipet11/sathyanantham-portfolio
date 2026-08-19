"""
Greenhouse Provider — Public job board API.

Uses the public Greenhouse job board API (no auth required).
Company-configurable via board tokens in env config.

API: https://developers.greenhouse.io/job-board.html
Endpoint: GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs
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

logger = logging.getLogger("job_discovery.providers.greenhouse")


class GreenhouseProvider(JobProvider):
    """
    Greenhouse public job board API provider.

    Requires board tokens to be configured (e.g. 'figma', 'stripe').
    Each token corresponds to a company's public Greenhouse job board.
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(name="greenhouse", config=config)
        self.base_url = config.base_url or "https://boards-api.greenhouse.io/v1"
        self.board_tokens: List[str] = config.extra.get("board_tokens", [])

    def _check_credentials(self) -> bool:
        return len(self.board_tokens) > 0

    def _get_status_message(self) -> Optional[str]:
        if not self._check_credentials():
            return (
                "Greenhouse requires board tokens. Set JOB_DISCOVERY_GREENHOUSE_BOARD_TOKENS "
                "in .env (comma-separated, e.g. 'figma,stripe,airbnb')"
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
        """Search across configured Greenhouse boards."""
        if not self.board_tokens:
            logger.info("Greenhouse: no board tokens configured, skipping")
            return []

        all_jobs: List[NormalizedJob] = []
        query_lower = query.lower()

        for token in self.board_tokens:
            try:
                url = f"{self.base_url}/boards/{token}/jobs"
                params = {"content": "true"}

                async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                    response = await client.get(url, params=params)
                    if response.status_code == 404:
                        logger.warning(f"Greenhouse: board '{token}' not found")
                        continue
                    response.raise_for_status()
                    data = response.json()

                raw_jobs = data.get("jobs", [])
                logger.info(f"Greenhouse [{token}]: {len(raw_jobs)} jobs found")

                for raw in raw_jobs:
                    # Filter by query
                    title = (raw.get("title") or "").lower()
                    content = (raw.get("content") or "").lower()
                    if query_lower and query_lower not in title and query_lower not in content:
                        continue

                    try:
                        job = self._normalize_job(raw, token)
                        if job:
                            all_jobs.append(job)
                    except Exception as e:
                        logger.warning(f"Greenhouse [{token}]: normalize error: {e}")

                    if len(all_jobs) >= limit:
                        break

            except Exception as e:
                logger.error(f"Greenhouse [{token}]: search failed: {e}")
                continue

            if len(all_jobs) >= limit:
                break

        return all_jobs[:limit]

    async def get_job(self, job_id: str) -> Optional[NormalizedJob]:
        """Fetch a single job by Greenhouse job ID."""
        for token in self.board_tokens:
            try:
                url = f"{self.base_url}/boards/{token}/jobs/{job_id}"
                async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                    response = await client.get(url, params={"content": "true"})
                    if response.status_code == 404:
                        continue
                    response.raise_for_status()
                    data = response.json()
                return self._normalize_job(data, token)
            except Exception:
                continue
        return None

    async def health_check(self) -> bool:
        """Verify at least one Greenhouse board is reachable."""
        if not self.board_tokens:
            return False
        for token in self.board_tokens[:1]:
            try:
                url = f"{self.base_url}/boards/{token}/jobs"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(url)
                    response.raise_for_status()
                    data = response.json()
                    if data.get("jobs") and len(data["jobs"]) > 0:
                        logger.info(f"Greenhouse [{token}]: health check PASSED")
                        return True
            except Exception as e:
                logger.error(f"Greenhouse [{token}]: health check FAILED: {e}")
        return False

    def _normalize_job(self, raw: dict, board_token: str) -> Optional[NormalizedJob]:
        """Convert Greenhouse API job to NormalizedJob."""
        title = (raw.get("title") or "").strip()
        if not title:
            return None

        # Greenhouse uses the board token as the company identifier
        company = board_token.capitalize()

        # Description (HTML)
        content = raw.get("content") or ""
        description = re.sub(r'<[^>]+>', ' ', content)
        description = re.sub(r'\s+', ' ', description).strip()
        if len(description) > 10000:
            description = description[:10000] + "..."

        # Location from offices
        offices = raw.get("offices") or []
        locations = [o.get("name", "") for o in offices if o.get("name")]
        location_raw = ", ".join(locations) if locations else "Not specified"

        location_type = LocationType.ONSITE
        combined = f"{title} {description} {location_raw}".lower()
        if "remote" in combined:
            location_type = LocationType.REMOTE
        elif "hybrid" in combined:
            location_type = LocationType.HYBRID

        # Departments as pseudo tech stack
        departments = raw.get("departments") or []
        dept_names = [d.get("name", "") for d in departments if d.get("name")]

        job_id = str(raw.get("id", ""))
        apply_url = raw.get("absolute_url") or f"https://boards.greenhouse.io/{board_token}/jobs/{job_id}"

        posted_date = raw.get("updated_at") or raw.get("first_published_at") or ""
        if posted_date:
            try:
                posted_date = posted_date[:10]
            except (TypeError, IndexError):
                posted_date = None

        return NormalizedJob(
            source="greenhouse",
            source_job_id=job_id,
            title=title,
            company=company,
            location=location_raw,
            location_type=location_type,
            employment_type=EmploymentType.FULL_TIME,
            description_raw=description or f"{title} at {company}",
            tech_stack=dept_names,
            job_url=apply_url,
            apply_url=apply_url,
            portal_type="greenhouse",
            status=JobStatus.DISCOVERED,
            posted_date=posted_date,
            discovered_at=datetime.utcnow().isoformat(),
            provider_metadata={
                "board_token": board_token,
                "departments": dept_names,
                "offices": locations,
            },
        )
