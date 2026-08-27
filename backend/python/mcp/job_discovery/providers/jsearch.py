"""
JSearch / Google for Jobs Provider.
Queries real-time job listings from Google for Jobs aggregator via OpenWeb Ninja / RapidAPI.
"""

import os
import sys
import json
import logging
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.python.mcp.job_discovery.providers.base import JobProvider
from backend.python.mcp.job_discovery.models.normalized_job import (
    NormalizedJob,
    LocationType,
    EmploymentType,
    JobStatus,
)
from backend.python.mcp.job_discovery.config import ProviderConfig

logger = logging.getLogger("job_discovery.providers.jsearch")


class JSearchProvider(JobProvider):
    """
    JSearch provider connecting to OpenWeb Ninja / RapidAPI Google for Jobs API.
    Interacts strictly with live API endpoints.
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(name="jsearch", config=config)
        self.api_key = (
            config.api_key
            or os.getenv("JSEARCH_API_KEY")
            or os.getenv("OPENWEBNINJA_API_KEY")
            or os.getenv("RAPIDAPI_KEY")
            or ""
        )
        self.base_url = (
            config.base_url
            or os.getenv("JSEARCH_BASE_URL")
            or "https://jsearch.p.rapidapi.com"
        )
        logger.info("JSearchProvider initialized in LIVE API mode")

    def _check_credentials(self) -> bool:
        """Verify API key is configured."""
        return bool(self.api_key)

    def _get_headers(self) -> Dict[str, str]:
        """Construct request headers based on endpoint host."""
        headers = {
            "Accept": "application/json",
            "User-Agent": "Sathyanantham-AI-JobHunter/1.0",
        }
        if "rapidapi.com" in self.base_url:
            headers["X-RapidAPI-Key"] = self.api_key
            headers["X-RapidAPI-Host"] = "jsearch.p.rapidapi.com"
        else:
            headers["x-api-key"] = self.api_key
            headers["X-RapidAPI-Key"] = self.api_key
        return headers

    def _map_recency_to_jsearch(self, recency_hours: int) -> str:
        """Map recency hours to JSearch date_posted filter."""
        if recency_hours <= 24:
            return "today"
        elif recency_hours <= 72:
            return "3days"
        elif recency_hours <= 168:
            return "week"
        elif recency_hours <= 720:
            return "month"
        return "all"

    def _log_debug_request(self, url: str, method: str, headers: Dict[str, str], params: Dict[str, Any]) -> None:
        """Print and log the internal HTTP request structure for debugging."""
        safe_headers = {
            k: ("***REDACTED***" if "key" in k.lower() or "auth" in k.lower() else v)
            for k, v in headers.items()
        }
        debug_msg = (
            f"\n==================== JSEARCH HTTP REQUEST DEBUG [LIVE API REQUEST] ====================\n"
            f"Method:  {method}\n"
            f"URL:     {url}\n"
            f"Params:  {json.dumps(params, indent=2)}\n"
            f"Headers: {json.dumps(safe_headers, indent=2)}\n"
            f"=================================================================================\n"
        )
        print(debug_msg, file=sys.stderr, flush=True)
        logger.info(f"JSearch Internal Call Debug: {method} {url} | Params: {params}")

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        remote_only: bool = False,
        limit: int = 20,
        recency_hours: int = 72,
        employment_type: Optional[str] = None,
        min_salary: Optional[float] = None,
        max_salary: Optional[float] = None,
        company: Optional[str] = None,
        tech_stack: Optional[List[str]] = None,
        date_posted: Optional[str] = None,
        job_requirements: Optional[str] = None,
        **kwargs: Any,
    ) -> List[NormalizedJob]:
        """
        Search JSearch / Google for Jobs for real job postings with rich filtering per OpenWeb Ninja API spec.
        """
        if not self._check_credentials():
            logger.warning("JSearch: JSEARCH_API_KEY not configured.")
            return []

        # Construct search query (combining query, company, and location)
        search_query = query.strip()
        if company and company.lower() not in search_query.lower():
            search_query = f"{company} {search_query}"

        if location and location.lower() not in ("remote", "anywhere", "all", "none"):
            if " in " not in search_query.lower() and " at " not in search_query.lower():
                search_query = f"{search_query} in {location.strip()}"
        elif remote_only:
            if "remote" not in search_query.lower():
                search_query = f"{search_query} remote"

        resolved_date_posted = date_posted or kwargs.get("date_posted") or self._map_recency_to_jsearch(recency_hours)

        # ── Construct OpenWeb Ninja / RapidAPI JSearch URL Parameters ────
        params: Dict[str, Any] = {
            "query": search_query,
            "page": str(kwargs.get("page", 1)),
            "num_pages": str(kwargs.get("num_pages", 1)),
            "date_posted": resolved_date_posted,
        }

        # 1. Cursor for pagination
        if kwargs.get("cursor"):
            params["cursor"] = str(kwargs.get("cursor"))

        # 2. Country (Full Name e.g. "india", "united states", "germany", "united kingdom")
        COUNTRY_FULL_NAME_MAP = {
            "in": "india",
            "india": "india",
            "us": "united states",
            "usa": "united states",
            "united states": "united states",
            "gb": "united kingdom",
            "uk": "united kingdom",
            "united kingdom": "united kingdom",
            "ca": "canada",
            "canada": "canada",
            "de": "germany",
            "germany": "germany",
            "au": "australia",
            "australia": "australia",
            "sg": "singapore",
            "singapore": "singapore",
            "ae": "united arab emirates",
            "uae": "united arab emirates",
            "fr": "france",
            "france": "france",
            "nl": "netherlands",
            "netherlands": "netherlands",
        }

        country_val = kwargs.get("country")
        combined_text = f"{search_query} {location or ''}".lower()
        if not country_val or str(country_val).strip().lower() in ("default", "none", "all", "auto"):
            if any(loc in combined_text for loc in ["chicago", "new york", "san francisco", "austin", "seattle", "los angeles", "boston", "atlanta", "dallas", "denver", "usa", "united states"]):
                country_val = "united states"
            elif any(loc in combined_text for loc in ["london", "manchester", "birmingham", "uk", "united kingdom", "england"]):
                country_val = "united kingdom"
            elif any(loc in combined_text for loc in ["india", "bangalore", "bengaluru", "chennai", "coimbatore", "delhi", "mumbai", "hyderabad", "pune", "noida", "gurgaon"]):
                country_val = "india"
            elif any(loc in combined_text for loc in ["toronto", "vancouver", "montreal", "canada"]):
                country_val = "canada"
            elif any(loc in combined_text for loc in ["berlin", "munich", "frankfurt", "germany"]):
                country_val = "germany"
            elif any(loc in combined_text for loc in ["sydney", "melbourne", "australia"]):
                country_val = "australia"
            elif any(loc in combined_text for loc in ["singapore"]):
                country_val = "singapore"
            elif any(loc in combined_text for loc in ["dubai", "abu dhabi", "uae"]):
                country_val = "united arab emirates"
            else:
                country_val = None

        if country_val and str(country_val).strip().lower() not in ("all", "global", "any", "none"):
            norm_country = str(country_val).lower().strip()
            params["country"] = COUNTRY_FULL_NAME_MAP.get(norm_country, norm_country)

        # 3. Language (ISO 639)
        if kwargs.get("language"):
            params["language"] = str(kwargs.get("language")).lower().strip()

        # 4. Work From Home / Remote
        wfh = kwargs.get("work_from_home")
        if wfh is True or remote_only or (location and location.lower() == "remote"):
            params["work_from_home"] = "true"
            params["remote_jobs_only"] = "true"

        # 5. Employment Types (FULLTIME, CONTRACTOR, PARTTIME, INTERN)
        raw_emp = employment_type or kwargs.get("employment_types")
        if raw_emp:
            if isinstance(raw_emp, list):
                raw_emp_str = ", ".join(str(e) for e in raw_emp).upper()
            else:
                raw_emp_str = str(raw_emp).upper()

            emp_mapped = []
            if "FULL" in raw_emp_str:
                emp_mapped.append("FULLTIME")
            if "CONTRACT" in raw_emp_str:
                emp_mapped.append("CONTRACTOR")
            if "PART" in raw_emp_str:
                emp_mapped.append("PARTTIME")
            if "INTERN" in raw_emp_str:
                emp_mapped.append("INTERN")
            if emp_mapped:
                params["employment_types"] = ",".join(emp_mapped)

        # 6. Job Requirements (under_3_years_experience, more_than_3_years_experience, no_experience, no_degree)
        raw_reqs = job_requirements or kwargs.get("job_requirements")
        if raw_reqs:
            if isinstance(raw_reqs, list):
                valid_reqs = [str(r).strip() for r in raw_reqs if str(r).strip() in (
                    "under_3_years_experience", "more_than_3_years_experience", "no_experience", "no_degree"
                )]
                if valid_reqs:
                    params["job_requirements"] = ",".join(valid_reqs)
            else:
                params["job_requirements"] = str(raw_reqs).strip()

        # 7. Exclude Job Publishers
        raw_exclude = kwargs.get("exclude_job_publishers")
        if raw_exclude:
            if isinstance(raw_exclude, list):
                params["exclude_job_publishers"] = ",".join(str(x) for x in raw_exclude)
            else:
                params["exclude_job_publishers"] = str(raw_exclude)

        # 8. Fields Projection
        if kwargs.get("fields"):
            params["fields"] = str(kwargs.get("fields"))

        if self.base_url.rstrip("/").endswith(("/search", "/search-v2", "/search-v2d")):
            url = self.base_url.rstrip("/")
        else:
            url = f"{self.base_url.rstrip('/')}/search"

        headers = self._get_headers()

        # ── Print Internal HTTP Request Details for Debugging ─────────────
        self._log_debug_request(url=url, method="GET", headers=headers, params=params)

        print(f"\n[JOB_DISCOVERY] ==================== JSEARCH API DISCOVERY ====================", flush=True)
        print(f"[JOB_DISCOVERY] Target Query: '{search_query}'", flush=True)
        print(f"[JOB_DISCOVERY] JSearch Parameters: {json.dumps(params, default=str)}", flush=True)
        print(f"[JOB_DISCOVERY] Target URL: {url}", flush=True)

        raw_jobs: List[Dict[str, Any]] = []

        logger.info(f"JSearch: querying live API '{search_query}' (date_posted={resolved_date_posted})")

        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                response = await client.get(url, headers=headers, params=params)
                print(f"[JOB_DISCOVERY] HTTP Response: {response.status_code} {response.reason_phrase}", flush=True)
                response.raise_for_status()
                data = response.json()

            raw_data = data.get("data")
            if isinstance(raw_data, dict):
                raw_jobs = raw_data.get("jobs", [])
            elif isinstance(raw_data, list):
                raw_jobs = raw_data
            else:
                raw_jobs = data.get("jobs", [])

            print(f"[JOB_DISCOVERY] Raw Postings Received: {len(raw_jobs)} job(s)", flush=True)
            if raw_jobs:
                for idx, rj in enumerate(raw_jobs[:5], 1):
                    title = rj.get("job_title", "Unknown Role")
                    company_name = rj.get("employer_name", "Unknown Company")
                    city = rj.get("job_city") or ""
                    state = rj.get("job_state") or ""
                    cntry = rj.get("job_country") or ""
                    loc_str = ", ".join(filter(bool, [city, state, cntry])) or "Remote / Unspecified"
                    print(f"[JOB_DISCOVERY]   #{idx} {title} @ {company_name} [{loc_str}]", flush=True)
            else:
                print(f"[JOB_DISCOVERY] [NOTICE] Zero jobs returned from JSearch for query: '{search_query}'", flush=True)
            print(f"[JOB_DISCOVERY] ====================================================================\n", flush=True)

            logger.info(f"JSearch: received {len(raw_jobs)} live results for '{search_query}'")

        except httpx.HTTPStatusError as http_err:
            print(f"[JOB_DISCOVERY] [ERROR] HTTP Error {http_err.response.status_code}: {http_err.response.text[:300]}", flush=True)
            logger.error(f"JSearch HTTP Error {http_err.response.status_code}: {http_err.response.text}")
            return []
        except Exception as e:
            print(f"[JOB_DISCOVERY] [ERROR] Discovery Exception: {e}", flush=True)
            logger.error(f"JSearch search error: {e}")
            return []

        # ── Process & Post-Filter Normalized Jobs ──────────────────────────
        normalized: List[NormalizedJob] = []
        for raw in raw_jobs:
            try:
                job = self._normalize_job(raw)
                if not job:
                    continue

                # Filter by company if requested
                if company and company.lower() not in job.company.lower():
                    continue

                # Filter by min_salary / max_salary if requested
                if min_salary is not None:
                    job_max = job.salary_max if job.salary_max is not None else job.salary_min
                    if job_max is not None and job_max < min_salary:
                        continue

                if max_salary is not None:
                    job_min = job.salary_min if job.salary_min is not None else job.salary_max
                    if job_min is not None and job_min > max_salary:
                        continue

                # Filter by tech_stack if requested
                if tech_stack:
                    job_text = f"{job.title} {job.description_raw} {' '.join(job.tech_stack)}".lower()
                    if not any(t.lower() in job_text for t in tech_stack):
                        continue

                normalized.append(job)
                if len(normalized) >= limit:
                    break

            except Exception as norm_err:
                logger.warning(f"JSearch: failed to normalize job item: {norm_err}")
                continue

        logger.info(f"JSearch: successfully returned {len(normalized)} normalized jobs")
        return normalized

    async def get_job(self, job_id: str) -> Optional[NormalizedJob]:
        """Fetch details for a single job by ID from live API."""
        if not self._check_credentials():
            return None

        url = f"{self.base_url.rstrip('/')}/job-details"
        headers = self._get_headers()
        params = {"job_id": job_id}

        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                data = response.json()

            raw_data = data.get("data")
            if isinstance(raw_data, list) and raw_data:
                return self._normalize_job(raw_data[0])
            elif isinstance(raw_data, dict):
                return self._normalize_job(raw_data)
            return None
        except Exception as e:
            logger.error(f"JSearch get_job({job_id}) live API error: {e}")
            return None

    async def health_check(self) -> bool:
        """Verify JSearch API endpoint is reachable."""
        if not self._check_credentials():
            return False
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"{self.base_url.rstrip('/')}/search" if not self.base_url.rstrip("/").endswith(("/search", "/search-v2")) else self.base_url.rstrip("/")
                response = await client.get(
                    url,
                    headers=self._get_headers(),
                    params={"query": "Developer", "page": "1", "num_pages": "1"}
                )
                return response.status_code == 200
        except Exception:
            return False

    def _normalize_job(self, raw: Dict[str, Any]) -> Optional[NormalizedJob]:
        """Convert a raw JSearch API job object into canonical NormalizedJob."""
        title = (raw.get("job_title") or "").strip()
        company = (raw.get("employer_name") or "").strip()
        if not title or not company:
            return None

        # Resolve Source ID
        job_id = str(raw.get("job_id") or raw.get("job_uid") or "")
        if not job_id:
            import uuid
            job_id = f"js-{uuid.uuid4().hex[:12]}"

        # Location mapping
        raw_location = raw.get("job_location") or ""
        city = raw.get("job_city") or ""
        country = raw.get("job_country") or ""
        is_remote = bool(raw.get("job_is_remote", False))

        location_str = raw_location
        if not location_str:
            parts = [p for p in (city, country) if p]
            location_str = ", ".join(parts) if parts else ("Remote" if is_remote else "Unspecified")

        location_type = LocationType.REMOTE if is_remote or "remote" in location_str.lower() else LocationType.ONSITE

        # Employment Type mapping
        emp_raw = (raw.get("job_employment_type") or "").upper()
        emp_types_list = [str(x).upper() for x in (raw.get("job_employment_types") or [])]
        emp_str = f"{emp_raw} {' '.join(emp_types_list)}"

        if "CONTRACT" in emp_str or "TEMPORARY" in emp_str:
            employment_type = EmploymentType.CONTRACT
        elif "PART" in emp_str:
            employment_type = EmploymentType.PART_TIME
        elif "INTERN" in emp_str:
            employment_type = EmploymentType.INTERNSHIP
        elif "FULL" in emp_str:
            employment_type = EmploymentType.FULL_TIME
        else:
            employment_type = EmploymentType.FULL_TIME

        # Description
        description_raw = (raw.get("job_description") or "").strip()

        # Apply URL
        apply_url = (raw.get("job_apply_link") or "").strip()
        if not apply_url and raw.get("apply_options"):
            opts = raw.get("apply_options")
            if isinstance(opts, list) and len(opts) > 0 and isinstance(opts[0], dict):
                apply_url = opts[0].get("apply_link", "")
        if not apply_url:
            apply_url = (raw.get("job_google_link") or "").strip()

        # Tech stack extraction from description & highlights
        highlights = raw.get("job_highlights") or {}
        qualifications = highlights.get("Qualifications") or []
        resp_highlights = highlights.get("Responsibilities") or []
        combined_text = f"{title} {description_raw} {' '.join(qualifications)} {' '.join(resp_highlights)}"
        
        tech_stack = self._extract_tech_stack(combined_text)

        # Salary
        min_sal = raw.get("job_min_salary")
        max_sal = raw.get("job_max_salary")
        sal_val = raw.get("job_salary")

        salary_min = float(min_sal) if min_sal is not None else (float(sal_val) if sal_val is not None else None)
        salary_max = float(max_sal) if max_sal is not None else (float(sal_val) if sal_val is not None else None)
        salary_currency = raw.get("job_salary_currency") or "USD"

        # Posting Date
        posted_at_utc = raw.get("job_posted_at_datetime_utc")
        posted_at_timestamp = raw.get("job_posted_at_timestamp")
        
        posted_date: Optional[str] = None
        if posted_at_utc:
            posted_date = str(posted_at_utc)[:10]
        elif posted_at_timestamp:
            try:
                posted_date = datetime.fromtimestamp(posted_at_timestamp).strftime("%Y-%m-%d")
            except Exception:
                posted_date = datetime.utcnow().strftime("%Y-%m-%d")
        else:
            posted_date = datetime.utcnow().strftime("%Y-%m-%d")

        # Company Domain Resolution (from response employer_website, apply_url or normalization service)
        from backend.python.services.company_normalization_service import company_normalization_service
        employer_website = raw.get("employer_website")
        company_domain = company_normalization_service.resolve_company_domain(
            company_name=company,
            employer_website=employer_website,
            apply_url=apply_url
        )

        return NormalizedJob(
            source="jsearch",
            source_job_id=job_id,
            title=title,
            company=company,
            company_domain=company_domain,
            location=location_str,
            location_type=location_type,
            employment_type=employment_type,
            salary_min=salary_min,
            salary_max=salary_max,
            salary_currency=salary_currency,
            description_raw=description_raw,
            tech_stack=tech_stack,
            apply_url=apply_url,
            posted_date=posted_date,
            discovered_at=datetime.utcnow().isoformat(),
            status=JobStatus.DISCOVERED,
            provider_metadata=raw,
        )

    def _extract_tech_stack(self, text: str) -> List[str]:
        """Extract canonical technology keywords from job text."""
        import re
        known_terms = [
            "React", "React.js", "TypeScript", "JavaScript", "Next.js", "Vue", "Vue.js", "Angular",
            "Node.js", "Python", "FastAPI", "Django", "Flask", "Go", "Golang", "Java", "C#", ".NET",
            "AWS", "GCP", "Azure", "Docker", "Kubernetes", "GraphQL", "REST", "SQL", "PostgreSQL",
            "MongoDB", "Redis", "Tailwind", "CSS", "HTML", "Sass", "Jest", "Playwright", "Cypress",
            "Vite", "Webpack", "Micro Frontend", "Micro Frontends", "Module Federation", "AI", "LLM"
        ]
        found = []
        for term in known_terms:
            pattern = r'\b' + re.escape(term) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                found.append(term)
        return list(dict.fromkeys(found))
