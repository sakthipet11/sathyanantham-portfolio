"""
Lever Provider — Public job postings API.

Uses Lever's public postings API (no auth required).
Company-configurable via company slugs in env config.

API: https://github.com/lever/postings-api
Endpoint: GET https://api.lever.co/v0/postings/{company}
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

logger = logging.getLogger("job_discovery.providers.lever")


class LeverProvider(JobProvider):
    """
    Lever public postings API provider.

    Requires company slugs to be configured (e.g. 'netlify', 'stripe').
    Each slug corresponds to a company's Lever career page.
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(name="lever", config=config)
        self.base_url = config.base_url or "https://api.lever.co/v0"
        self.companies: List[str] = config.extra.get("companies", [])

    def _check_credentials(self) -> bool:
        return len(self.companies) > 0

    def _get_status_message(self) -> Optional[str]:
        if not self._check_credentials():
            return (
                "Lever requires company slugs. Set JOB_DISCOVERY_LEVER_COMPANIES "
                "in .env (comma-separated, e.g. 'stripe,netlify')"
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
        """Search across configured Lever company postings."""
        if not self.companies:
            logger.info("Lever: no companies configured, skipping")
            return []

        all_jobs: List[NormalizedJob] = []
        query_lower = query.lower()

        for company_slug in self.companies:
            try:
                url = f"{self.base_url}/postings/{company_slug}"
                params: dict = {"mode": "json"}

                async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                    response = await client.get(url, params=params)
                    if response.status_code == 404:
                        logger.warning(f"Lever: company '{company_slug}' not found")
                        continue
                    response.raise_for_status()
                    raw_jobs = response.json()

                if not isinstance(raw_jobs, list):
                    logger.warning(f"Lever [{company_slug}]: unexpected response format")
                    continue

                logger.info(f"Lever [{company_slug}]: {len(raw_jobs)} postings found")

                for raw in raw_jobs:
                    title = (raw.get("text") or "").lower()
                    description = (raw.get("descriptionPlain") or raw.get("description") or "").lower()
                    if query_lower and query_lower not in title and query_lower not in description:
                        continue

                    try:
                        job = self._normalize_job(raw, company_slug)
                        if job:
                            all_jobs.append(job)
                    except Exception as e:
                        logger.warning(f"Lever [{company_slug}]: normalize error: {e}")

                    if len(all_jobs) >= limit:
                        break

            except Exception as e:
                logger.error(f"Lever [{company_slug}]: search failed: {e}")
                continue

            if len(all_jobs) >= limit:
                break

        return all_jobs[:limit]

    async def get_job(self, job_id: str) -> Optional[NormalizedJob]:
        """Fetch a single Lever posting by ID."""
        for company_slug in self.companies:
            try:
                url = f"{self.base_url}/postings/{company_slug}/{job_id}"
                async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                    response = await client.get(url)
                    if response.status_code == 404:
                        continue
                    response.raise_for_status()
                    data = response.json()
                return self._normalize_job(data, company_slug)
            except Exception:
                continue
        return None

    async def health_check(self) -> bool:
        """Verify at least one Lever company is reachable."""
        if not self.companies:
            return False
        for slug in self.companies[:1]:
            try:
                url = f"{self.base_url}/postings/{slug}"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(url, params={"mode": "json"})
                    response.raise_for_status()
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        logger.info(f"Lever [{slug}]: health check PASSED")
                        return True
            except Exception as e:
                logger.error(f"Lever [{slug}]: health check FAILED: {e}")
        return False

    def _normalize_job(self, raw: dict, company_slug: str) -> Optional[NormalizedJob]:
        """Convert Lever posting to NormalizedJob."""
        title = (raw.get("text") or "").strip()
        if not title:
            return None

        company = company_slug.replace("-", " ").title()

        # Description
        desc_plain = raw.get("descriptionPlain") or ""
        desc_html = raw.get("description") or ""
        description = desc_plain or re.sub(r'<[^>]+>', ' ', desc_html)
        description = re.sub(r'\s+', ' ', description).strip()

        # Additional content from lists
        additional_parts = []
        for lst in (raw.get("lists") or []):
            list_text = lst.get("text", "")
            list_content = lst.get("content") or ""
            list_content_clean = re.sub(r'<[^>]+>', ' ', list_content).strip()
            if list_text or list_content_clean:
                additional_parts.append(f"{list_text}: {list_content_clean}")

        if additional_parts:
            description += " " + " ".join(additional_parts)

        if len(description) > 10000:
            description = description[:10000] + "..."

        # Location
        categories = raw.get("categories") or {}
        location_raw = categories.get("location") or "Not specified"
        commitment = categories.get("commitment") or ""
        team = categories.get("team") or ""

        location_type = LocationType.ONSITE
        combined = f"{title} {description} {location_raw}".lower()
        if "remote" in combined:
            location_type = LocationType.REMOTE
        elif "hybrid" in combined:
            location_type = LocationType.HYBRID

        emp_type = EmploymentType.FULL_TIME
        if "part" in commitment.lower():
            emp_type = EmploymentType.PART_TIME
        elif "contract" in commitment.lower() or "intern" in commitment.lower():
            emp_type = EmploymentType.CONTRACT

        job_id = str(raw.get("id", ""))
        apply_url = raw.get("applyUrl") or raw.get("hostedUrl") or ""
        hosted_url = raw.get("hostedUrl") or apply_url

        if not apply_url:
            return None

        created_at = raw.get("createdAt")
        posted_date = None
        if created_at:
            try:
                posted_date = datetime.fromtimestamp(created_at / 1000).strftime("%Y-%m-%d")
            except (ValueError, TypeError, OSError):
                posted_date = None

        return NormalizedJob(
            source="lever",
            source_job_id=job_id,
            title=title,
            company=company,
            location=location_raw,
            location_type=location_type,
            employment_type=emp_type,
            description_raw=description or f"{title} at {company}",
            tech_stack=[team] if team else [],
            job_url=hosted_url,
            apply_url=apply_url,
            portal_type="lever",
            status=JobStatus.DISCOVERED,
            posted_date=posted_date,
            discovered_at=datetime.utcnow().isoformat(),
            provider_metadata={
                "company_slug": company_slug,
                "commitment": commitment,
                "team": team,
                "department": categories.get("department"),
            },
        )
