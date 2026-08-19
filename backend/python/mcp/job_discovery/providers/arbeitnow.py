"""
Arbeitnow Provider — Live European and Global tech job board API.

API: https://www.arbeitnow.com/api/job-board-api
Free JSON API returning real tech, software engineering, and remote roles.
"""

import logging
import re
from typing import List, Optional, Any
from datetime import datetime

import httpx

from backend.python.mcp.job_discovery.providers.base import JobProvider
from backend.python.mcp.job_discovery.models.normalized_job import (
    NormalizedJob,
    LocationType,
    EmploymentType,
    JobStatus,
)
from backend.python.mcp.job_discovery.config import ProviderConfig

logger = logging.getLogger("job_discovery.providers.arbeitnow")


class ArbeitnowProvider(JobProvider):
    """
    Arbeitnow job discovery provider.
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(name="arbeitnow", config=config)
        self.base_url = "https://www.arbeitnow.com/api/job-board-api"

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 25,
        **kwargs: Any,
    ) -> List[NormalizedJob]:
        logger.info(f"Arbeitnow: searching query='{query}'")

        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds, follow_redirects=True) as client:
                response = await client.get(self.base_url)
                if response.status_code != 200:
                    logger.warning(f"Arbeitnow: non-200 response ({response.status_code})")
                    return []

                raw_jobs = response.json().get("data", [])
                query_terms = [t.lower() for t in query.split() if len(t) > 2]
                matching_jobs: List[NormalizedJob] = []

                for raw in raw_jobs:
                    title = (raw.get("title") or "").strip()
                    company = (raw.get("company_name") or "").strip()
                    tags = raw.get("tags") or []
                    desc_html = raw.get("description") or ""
                    is_remote = raw.get("remote", False)
                    job_location = raw.get("location") or ("Remote" if is_remote else "EU / Global")

                    if remote_only and not is_remote and "remote" not in job_location.lower():
                        continue

                    text_blob = f"{title} {company} {' '.join(tags)} {desc_html}".lower()
                    if query_terms and not any(term in text_blob for term in query_terms):
                        continue

                    desc_clean = re.sub(r'<[^>]+>', ' ', desc_html)
                    desc_clean = re.sub(r'\s+', ' ', desc_clean).strip()
                    if len(desc_clean) > 8000:
                        desc_clean = desc_clean[:8000] + "..."

                    apply_url = raw.get("url") or ""
                    if not apply_url:
                        continue

                    slug = raw.get("slug") or str(raw.get("id") or "")
                    posted_epoch = raw.get("created_at")
                    posted_date = None
                    if posted_epoch:
                        try:
                            posted_date = datetime.fromtimestamp(int(posted_epoch)).strftime("%Y-%m-%d")
                        except Exception:
                            pass

                    job = NormalizedJob(
                        source="arbeitnow",
                        source_job_id=slug,
                        title=title,
                        company=company,
                        location=job_location,
                        location_type=LocationType.REMOTE if is_remote else LocationType.ONSITE,
                        employment_type=EmploymentType.FULL_TIME,
                        description_raw=desc_clean or f"{title} at {company}",
                        tech_stack=tags,
                        job_url=apply_url,
                        apply_url=apply_url,
                        portal_type="arbeitnow",
                        status=JobStatus.DISCOVERED,
                        posted_date=posted_date,
                        discovered_at=datetime.utcnow().isoformat(),
                    )
                    matching_jobs.append(job)

                    if len(matching_jobs) >= limit:
                        break

                logger.info(f"Arbeitnow: returned {len(matching_jobs)} matching jobs")
                return matching_jobs

        except Exception as e:
            logger.error(f"Arbeitnow search failed: {e}")
            return []

    async def get_job(self, job_id: str) -> Optional[NormalizedJob]:
        return None

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                res = await client.get(self.base_url)
                return res.status_code == 200
        except Exception:
            return False
