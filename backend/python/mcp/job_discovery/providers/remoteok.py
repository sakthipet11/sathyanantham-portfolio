"""
RemoteOK Provider — Live tech and software engineering remote jobs.

API: https://remoteok.com/api
Returns real remote job listings with tags, salaries, and direct URLs.
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

logger = logging.getLogger("job_discovery.providers.remoteok")


class RemoteOKProvider(JobProvider):
    """
    RemoteOK job discovery provider for tech and developer postings.
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(name="remoteok", config=config)
        self.base_url = "https://remoteok.com/api"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json",
        }

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = True,
        limit: int = 25,
        **kwargs: Any,
    ) -> List[NormalizedJob]:
        logger.info(f"RemoteOK: searching query='{query}'")

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=self.config.timeout_seconds, follow_redirects=True) as client:
                response = await client.get(self.base_url)
                if response.status_code != 200:
                    logger.warning(f"RemoteOK: non-200 response ({response.status_code})")
                    return []

                raw_data = response.json()
                if not isinstance(raw_data, list):
                    return []

                # Filter out the legal/meta header item
                raw_jobs = [j for j in raw_data if isinstance(j, dict) and j.get("position")]

                query_terms = [t.lower() for t in query.split() if len(t) > 2]
                matching_jobs: List[NormalizedJob] = []

                for raw in raw_jobs:
                    position = (raw.get("position") or "").strip()
                    company = (raw.get("company") or "").strip()
                    tags = raw.get("tags") or []
                    desc_html = raw.get("description") or ""

                    # Filter matching query
                    text_blob = f"{position} {company} {' '.join(tags)} {desc_html}".lower()
                    if query_terms and not any(term in text_blob for term in query_terms):
                        continue

                    # Clean description
                    desc_clean = re.sub(r'<[^>]+>', ' ', desc_html)
                    desc_clean = re.sub(r'\s+', ' ', desc_clean).strip()
                    if len(desc_clean) > 8000:
                        desc_clean = desc_clean[:8000] + "..."

                    apply_url = raw.get("url") or raw.get("apply_url") or ""
                    if not apply_url:
                        continue
                    if not apply_url.startswith("http"):
                        apply_url = f"https://remoteok.com{apply_url}"

                    job_id = str(raw.get("id") or raw.get("slug") or "")

                    # Salary parsing
                    salary_min = None
                    salary_max = None
                    salary_raw = raw.get("salary") or ""
                    if salary_raw:
                        nums = re.findall(r'\$?(\d+)', salary_raw)
                        if len(nums) >= 2:
                            try:
                                salary_min = float(nums[0]) * (1000 if float(nums[0]) < 1000 else 1)
                                salary_max = float(nums[1]) * (1000 if float(nums[1]) < 1000 else 1)
                            except (ValueError, IndexError):
                                pass

                    posted_date = None
                    epoch = raw.get("epoch")
                    if epoch:
                        try:
                            posted_date = datetime.fromtimestamp(int(epoch)).strftime("%Y-%m-%d")
                        except Exception:
                            pass

                    job = NormalizedJob(
                        source="remoteok",
                        source_job_id=job_id,
                        title=position,
                        company=company,
                        location=raw.get("location") or "Worldwide / Remote",
                        location_type=LocationType.REMOTE,
                        employment_type=EmploymentType.FULL_TIME,
                        salary_min=salary_min,
                        salary_max=salary_max,
                        salary_currency="USD",
                        description_raw=desc_clean or f"{position} at {company}",
                        tech_stack=tags,
                        job_url=apply_url,
                        apply_url=apply_url,
                        portal_type="remoteok",
                        status=JobStatus.DISCOVERED,
                        posted_date=posted_date,
                        discovered_at=datetime.utcnow().isoformat(),
                    )
                    matching_jobs.append(job)

                    if len(matching_jobs) >= limit:
                        break

                logger.info(f"RemoteOK: returned {len(matching_jobs)} matching jobs")
                return matching_jobs

        except Exception as e:
            logger.error(f"RemoteOK search failed: {e}")
            return []

    async def get_job(self, job_id: str) -> Optional[NormalizedJob]:
        return None

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=10.0, follow_redirects=True) as client:
                res = await client.get(self.base_url)
                return res.status_code == 200
        except Exception:
            return False
