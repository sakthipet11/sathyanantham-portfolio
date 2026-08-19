"""
Remotive.com Provider — Free public API, no API key required.

This is the first real provider implemented, chosen because it:
1. Has a free, public API with no authentication
2. Returns real remote job listings
3. Serves as the validation reference for the entire MCP pipeline

API docs: https://remotive.com/api-documentation
Endpoint: GET https://remotive.com/api/remote-jobs
"""

import logging
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
from backend.python.mcp.job_discovery.middleware.security import validate_url_domain

logger = logging.getLogger("job_discovery.providers.remotive")

# Remotive job categories mapping
CATEGORY_MAP = {
    "software-dev": "Software Development",
    "devops": "DevOps / Sysadmin",
    "frontend-dev": "Frontend Development",
    "backend-dev": "Backend Development",
    "data": "Data",
    "design": "Design",
    "product": "Product",
    "qa": "QA",
    "all-others": "All Others",
}


class RemotiveProvider(JobProvider):
    """
    Remotive.com job provider.

    Uses the free public API at https://remotive.com/api/remote-jobs
    No API key required. Returns real remote job listings globally.
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(name="remotive", config=config)
        self.base_url = config.base_url or "https://remotive.com/api"

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 50,
        **kwargs: Any,
    ) -> List[NormalizedJob]:
        """
        Search Remotive for remote jobs.

        Remotive API params:
          - search: keyword search
          - category: job category slug
          - limit: max results (API default is all)
        """
        url = f"{self.base_url}/remote-jobs"
        params: dict = {}

        if query:
            params["search"] = query
        if limit:
            params["limit"] = min(limit, 100)  # Remotive caps at around 100

        logger.info(f"Remotive: searching query='{query}' limit={limit}")

        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        raw_jobs = data.get("jobs", [])
        logger.info(f"Remotive: received {len(raw_jobs)} raw results")

        normalized: List[NormalizedJob] = []
        for raw in raw_jobs[:limit]:
            try:
                job = self._normalize_job(raw)
                if job:
                    normalized.append(job)
            except Exception as e:
                logger.warning(f"Remotive: failed to normalize job: {e}")
                continue

        logger.info(f"Remotive: normalized {len(normalized)} jobs")
        return normalized

    async def get_job(self, job_id: str) -> Optional[NormalizedJob]:
        """
        Fetch a single job by Remotive job ID.

        Remotive doesn't have a direct single-job endpoint in their public API,
        so we search and filter. This is a known limitation.
        """
        try:
            url = f"{self.base_url}/remote-jobs"
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                response = await client.get(url, params={"limit": 200})
                response.raise_for_status()
                data = response.json()

            for raw in data.get("jobs", []):
                if str(raw.get("id")) == str(job_id):
                    return self._normalize_job(raw)
            return None
        except Exception as e:
            logger.error(f"Remotive: get_job({job_id}) failed: {e}")
            return None

    async def health_check(self) -> bool:
        """Verify Remotive API is reachable and returning data."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/remote-jobs",
                    params={"limit": 1},
                )
                response.raise_for_status()
                data = response.json()
                jobs = data.get("jobs", [])
                if len(jobs) > 0:
                    logger.info("Remotive: health check PASSED (real data verified)")
                    return True
                logger.warning("Remotive: health check returned 0 jobs")
                return False
        except Exception as e:
            logger.error(f"Remotive: health check FAILED: {e}")
            return False

    def _normalize_job(self, raw: dict) -> Optional[NormalizedJob]:
        """Convert a raw Remotive API job object to NormalizedJob."""
        title = (raw.get("title") or "").strip()
        company = (raw.get("company_name") or "").strip()
        if not title or not company:
            return None

        # Parse description — Remotive returns HTML
        description_html = raw.get("description") or ""
        # Simple HTML strip for normalization
        import re
        description_text = re.sub(r'<[^>]+>', ' ', description_html)
        description_text = re.sub(r'\s+', ' ', description_text).strip()

        # Truncate extremely long descriptions
        if len(description_text) > 10000:
            description_text = description_text[:10000] + "..."

        # Location
        location_raw = raw.get("candidate_required_location") or "Worldwide"
        location_type = LocationType.REMOTE  # Remotive is all remote

        # Employment type
        job_type = (raw.get("job_type") or "").lower()
        employment_type = EmploymentType.FULL_TIME
        if "part" in job_type:
            employment_type = EmploymentType.PART_TIME
        elif "contract" in job_type or "freelance" in job_type:
            employment_type = EmploymentType.CONTRACT

        # Salary parsing from description or salary field
        salary_text = raw.get("salary") or ""
        salary_min, salary_max = self._parse_salary(salary_text, description_text)

        # Tech stack extraction
        tech_stack = self._extract_tech_stack(f"{title} {description_text}")

        # Posted date
        publication_date = raw.get("publication_date") or ""
        posted_date = None
        if publication_date:
            try:
                dt = datetime.fromisoformat(publication_date.replace("T", " ").split(".")[0])
                posted_date = dt.strftime("%Y-%m-%d")
            except (ValueError, AttributeError):
                posted_date = publication_date[:10] if len(publication_date) >= 10 else None

        # URLs
        job_url = raw.get("url") or ""
        apply_url = job_url  # Remotive URL is the apply URL

        if not apply_url:
            return None

        # Category as tag
        category = raw.get("category") or ""
        tags = [t.strip() for t in (raw.get("tags") or []) if t.strip()]

        return NormalizedJob(
            source="remotive",
            source_job_id=str(raw.get("id", "")),
            title=title,
            company=company,
            location=location_raw,
            location_type=location_type,
            employment_type=employment_type,
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency="USD",
            description_raw=description_text,
            requirements_clean=None,  # Remotive doesn't separate requirements
            responsibilities=None,
            tech_stack=tech_stack or tags,
            job_url=job_url,
            apply_url=apply_url,
            portal_type="remotive",
            status=JobStatus.DISCOVERED,
            posted_date=posted_date,
            discovered_at=datetime.utcnow().isoformat(),
            provider_metadata={
                "category": category,
                "tags": tags,
                "company_logo": raw.get("company_logo"),
                "company_logo_url": raw.get("company_logo_url"),
            },
        )

    @staticmethod
    def _parse_salary(salary_text: str, description: str) -> tuple:
        """Extract salary range from salary field or description."""
        import re
        combined = f"{salary_text} {description}"
        # Match patterns like $120,000 - $180,000 or 120k-180k
        match = re.search(
            r'\$?([\d,]+(?:\.\d{2})?)\s*[k]?\s*(?:[-–—to]+)\s*\$?([\d,]+(?:\.\d{2})?)\s*[k]?',
            combined,
            re.IGNORECASE,
        )
        if match:
            try:
                min_val = float(match.group(1).replace(",", ""))
                max_val = float(match.group(2).replace(",", ""))
                # Normalize k values
                if min_val < 1000:
                    min_val *= 1000
                if max_val < 1000:
                    max_val *= 1000
                if min_val > 0 and max_val > 0 and max_val >= min_val:
                    return (min_val, max_val)
            except (ValueError, IndexError):
                pass
        return (None, None)

    @staticmethod
    def _extract_tech_stack(text: str) -> List[str]:
        """Extract recognized technologies from job text."""
        import re
        known_tech = [
            "React", "TypeScript", "JavaScript", "Python", "Node.js", "Next.js",
            "Vue.js", "Angular", "FastAPI", "Django", "Flask", "GraphQL",
            "REST API", "Docker", "Kubernetes", "AWS", "GCP", "Azure",
            "PostgreSQL", "MongoDB", "Redis", "Terraform", "CI/CD",
            "Tailwind CSS", "Sass", "Webpack", "Vite", "Go", "Rust",
            "Java", "Spring Boot", "Ruby", "Rails", "PHP", "Laravel",
            "Svelte", "Flutter", "React Native", "Swift", "Kotlin",
            "Figma", "Git", "Linux", "Elasticsearch", "Kafka",
            "Micro Frontends", "Module Federation", "Design Systems",
        ]
        found = []
        text_lower = text.lower()
        for tech in known_tech:
            pattern = rf'\b{re.escape(tech.lower())}\b'
            if re.search(pattern, text_lower):
                found.append(tech)
        return found
