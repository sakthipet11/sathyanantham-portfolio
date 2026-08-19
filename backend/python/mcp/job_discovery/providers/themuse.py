"""
The Muse Provider — Public enterprise and tech jobs API.

API: https://www.themuse.com/api/public/jobs
Returns verified real jobs from top enterprise companies (Google, Stripe, Uber, Airbnb, etc.).
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

logger = logging.getLogger("job_discovery.providers.themuse")


class TheMuseProvider(JobProvider):
    """
    The Muse job discovery provider for enterprise tech postings.
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(name="themuse", config=config)
        self.base_url = "https://www.themuse.com/api/public/jobs"

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 25,
        **kwargs: Any,
    ) -> List[NormalizedJob]:
        params: dict = {
            "category": "Software Engineering",
            "page": 1,
        }
        if location:
            params["location"] = location

        logger.info(f"TheMuse: searching category='Software Engineering', query='{query}'")

        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds, follow_redirects=True) as client:
                response = await client.get(self.base_url, params=params)
                if response.status_code != 200:
                    logger.warning(f"TheMuse: non-200 response ({response.status_code})")
                    return []

                raw_jobs = response.json().get("results", [])
                query_terms = [t.lower() for t in query.split() if len(t) > 2]
                matching_jobs: List[NormalizedJob] = []

                for raw in raw_jobs:
                    title = (raw.get("name") or "").strip()
                    company = (raw.get("company", {}).get("name") or "").strip()
                    locations = [l.get("name", "") for l in raw.get("locations", []) if l.get("name")]
                    loc_text = ", ".join(locations) if locations else "Flexible / Remote"
                    desc_html = raw.get("contents") or ""

                    text_blob = f"{title} {company} {loc_text} {desc_html}".lower()
                    if query_terms and not any(term in text_blob for term in query_terms):
                        continue

                    desc_clean = re.sub(r'<[^>]+>', ' ', desc_html)
                    desc_clean = re.sub(r'\s+', ' ', desc_clean).strip()
                    if len(desc_clean) > 8000:
                        desc_clean = desc_clean[:8000] + "..."

                    apply_url = raw.get("refs", {}).get("landing_page") or ""
                    if not apply_url:
                        continue

                    job_id = str(raw.get("id") or "")
                    posted_date = (raw.get("publication_date") or "")[:10] if raw.get("publication_date") else None

                    loc_type = LocationType.ONSITE
                    if "remote" in f"{title} {loc_text}".lower() or "flexible" in loc_text.lower():
                        loc_type = LocationType.REMOTE

                    job = NormalizedJob(
                        source="themuse",
                        source_job_id=job_id,
                        title=title,
                        company=company,
                        location=loc_text,
                        location_type=loc_type,
                        employment_type=EmploymentType.FULL_TIME,
                        description_raw=desc_clean or f"{title} at {company}",
                        tech_stack=[],
                        job_url=apply_url,
                        apply_url=apply_url,
                        portal_type="themuse",
                        status=JobStatus.DISCOVERED,
                        posted_date=posted_date,
                        discovered_at=datetime.utcnow().isoformat(),
                    )
                    matching_jobs.append(job)

                    if len(matching_jobs) >= limit:
                        break

                logger.info(f"TheMuse: returned {len(matching_jobs)} matching jobs")
                return matching_jobs

        except Exception as e:
            logger.error(f"TheMuse search failed: {e}")
            return []

    async def get_job(self, job_id: str) -> Optional[NormalizedJob]:
        return None

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                res = await client.get(self.base_url, params={"page": 1})
                return res.status_code == 200
        except Exception:
            return False
