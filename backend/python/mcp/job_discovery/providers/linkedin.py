"""
LinkedIn Jobs Provider — Live real-time job discovery from LinkedIn.

Uses LinkedIn's public guest job search endpoint:
https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search

Fetches real job listings, titles, company names, locations, and direct apply/view URLs.
"""

import logging
import re
from typing import List, Optional, Any
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

from backend.python.mcp.job_discovery.providers.base import JobProvider
from backend.python.mcp.job_discovery.models.normalized_job import (
    NormalizedJob,
    LocationType,
    EmploymentType,
    JobStatus,
)
from backend.python.mcp.job_discovery.config import ProviderConfig

logger = logging.getLogger("job_discovery.providers.linkedin")


class LinkedInProvider(JobProvider):
    """
    LinkedIn job discovery provider querying real-time public postings.
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(name="linkedin", config=config)
        self.base_url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 25,
        **kwargs: Any,
    ) -> List[NormalizedJob]:
        params: dict = {
            "keywords": query,
            "start": 0,
        }
        if location:
            params["location"] = location
        elif remote_only:
            params["location"] = "Remote"
            params["f_WT"] = "2"  # LinkedIn remote filter code

        logger.info(f"LinkedIn: searching query='{query}', location='{location or 'Remote'}'")

        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=self.config.timeout_seconds, follow_redirects=True) as client:
                response = await client.get(self.base_url, params=params)
                if response.status_code != 200:
                    logger.warning(f"LinkedIn: non-200 response ({response.status_code})")
                    return []

                soup = BeautifulSoup(response.text, "html.parser")
                cards = soup.find_all("li")

                normalized: List[NormalizedJob] = []
                for card in cards[:limit]:
                    title_elem = card.find("h3", class_="base-search-card__title")
                    comp_elem = card.find("h4", class_="base-search-card__subtitle") or card.find("a", class_="hidden-nested-link")
                    loc_elem = card.find("span", class_="job-search-card__location")
                    link_elem = card.find("a", class_="base-card__full-link") or card.find("a", href=True)
                    time_elem = card.find("time")

                    if not title_elem or not comp_elem:
                        continue

                    title = title_elem.text.strip()
                    company = comp_elem.text.strip()
                    loc_text = loc_elem.text.strip() if loc_elem else (location or "Remote")
                    apply_url = link_elem["href"].split("?")[0] if link_elem and link_elem.get("href") else ""
                    
                    if not apply_url:
                        continue

                    # Extract job ID from URL
                    job_id_match = re.search(r'(\d+)', apply_url)
                    source_job_id = job_id_match.group(1) if job_id_match else apply_url[-20:]

                    posted_date = None
                    if time_elem and time_elem.get("datetime"):
                        posted_date = time_elem["datetime"][:10]

                    loc_type = LocationType.ONSITE
                    if "remote" in f"{title} {loc_text}".lower():
                        loc_type = LocationType.REMOTE
                    elif "hybrid" in f"{title} {loc_text}".lower():
                        loc_type = LocationType.HYBRID

                    job = NormalizedJob(
                        source="linkedin",
                        source_job_id=source_job_id,
                        title=title,
                        company=company,
                        location=loc_text,
                        location_type=loc_type,
                        employment_type=EmploymentType.FULL_TIME,
                        description_raw=f"{title} at {company}. Location: {loc_text}. Direct posting on LinkedIn.",
                        tech_stack=[],
                        job_url=apply_url,
                        apply_url=apply_url,
                        portal_type="linkedin",
                        status=JobStatus.DISCOVERED,
                        posted_date=posted_date,
                        discovered_at=datetime.utcnow().isoformat(),
                    )
                    normalized.append(job)

                logger.info(f"LinkedIn: normalized {len(normalized)} real jobs")
                return normalized

        except Exception as e:
            logger.error(f"LinkedIn search failed: {e}")
            return []

    async def get_job(self, job_id: str) -> Optional[NormalizedJob]:
        return None

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(headers=self.headers, timeout=10.0, follow_redirects=True) as client:
                res = await client.get(self.base_url, params={"keywords": "React", "start": 0})
                return res.status_code == 200
        except Exception:
            return False
