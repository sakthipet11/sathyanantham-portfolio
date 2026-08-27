"""
Search parameter and response models for MCP tools.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from backend.python.mcp.job_discovery.models.normalized_job import NormalizedJob


class JobSearchParams(BaseModel):
    """Parameters for the search_jobs MCP tool."""
    query: str = Field(description="Job title or keyword search query")
    location: Optional[str] = Field(default=None, description="Location filter e.g. 'Remote', 'Bangalore'")
    remote_only: bool = Field(default=False, description="Filter to remote-only positions")
    work_from_home: Optional[bool] = Field(default=None, description="JSearch work_from_home boolean")
    country: Optional[str] = Field(default=None, description="Country code (ISO 3166-1 alpha-2, e.g. 'in', 'us')")
    language: Optional[str] = Field(default="en", description="Language code (ISO 639)")
    cursor: Optional[str] = Field(default=None, description="Cursor for pagination")
    employment_type: Optional[str] = Field(default=None, description="Full-time, Part-time, Contract, etc.")
    recency_hours: Optional[int] = Field(default=72, description="Posting recency window in hours")
    date_posted: Optional[str] = Field(default=None, description="JSearch date_posted: 'all', 'today', '3days', 'week', 'month'")
    min_salary: Optional[float] = Field(default=None, description="Minimum salary filter (USD)")
    max_salary: Optional[float] = Field(default=None, description="Maximum salary filter (USD)")
    company: Optional[str] = Field(default=None, description="Filter by company name")
    tech_stack: Optional[List[str]] = Field(default=None, description="Required technologies e.g. ['React', 'TypeScript']")
    job_requirements: Optional[str] = Field(default=None, description="JSearch job_requirements e.g. 'more_than_3_years_experience'")
    exclude_job_publishers: Optional[str] = Field(default=None, description="Comma-separated publishers to exclude")
    fields: Optional[str] = Field(default=None, description="Comma-separated field projection")
    page: int = Field(default=1, ge=1, description="Page number")
    num_pages: int = Field(default=1, ge=1, le=20, description="Total pages to fetch (1-20)")
    providers: Optional[List[str]] = Field(default=None, description="Specific providers to search (None = all enabled)")
    limit: int = Field(default=50, ge=1, le=200, description="Max results to return")
    offset: int = Field(default=0, ge=0, description="Pagination offset")


class ProfileSearchParams(BaseModel):
    """Parameters for search_jobs_for_profile — profile-aware search."""
    target_titles: List[str] = Field(
        default_factory=lambda: ["Lead Frontend Architect", "Principal UI Platform Engineer"],
        description="Target job titles to search for"
    )
    target_locations: List[str] = Field(
        default_factory=lambda: ["Remote", "Hybrid"],
        description="Preferred locations"
    )
    primary_skills: List[str] = Field(
        default_factory=list,
        description="Candidate's primary skills for matching"
    )
    min_experience_years: Optional[float] = Field(default=None)
    blacklisted_companies: List[str] = Field(default_factory=list)
    blacklisted_keywords: List[str] = Field(default_factory=list)
    min_salary: Optional[float] = Field(default=None)
    providers: Optional[List[str]] = Field(default=None)
    limit: int = Field(default=50, ge=1, le=200)


class CompanySearchParams(BaseModel):
    """Parameters for search_companies tool."""
    company_name: str = Field(description="Company name to look up")
    include_jobs: bool = Field(default=True, description="Include active job listings")


class ProviderError(BaseModel):
    """Error details from a single provider."""
    provider: str
    error_type: str
    message: str
    status_code: Optional[int] = None
    retryable: bool = False


class SearchResult(BaseModel):
    """Unified search response wrapping results from all providers."""
    status: str = Field(description="'success' | 'partial' | 'degraded'")
    total_results: int = 0
    jobs: List[NormalizedJob] = Field(default_factory=list)
    deduplicated_count: int = Field(default=0, description="Number of duplicates removed")
    provider_results: Dict[str, int] = Field(
        default_factory=dict,
        description="Per-provider result counts"
    )
    provider_errors: List[ProviderError] = Field(default_factory=list)
    search_params: Dict[str, Any] = Field(default_factory=dict)
    cached: bool = False
    search_duration_ms: Optional[float] = None

    def compute_status(self) -> str:
        """Determine overall search status from provider results."""
        total_providers = len(self.provider_results) + len(self.provider_errors)
        if total_providers == 0:
            return "degraded"
        if len(self.provider_errors) == 0:
            return "success"
        if len(self.provider_errors) == total_providers:
            return "degraded"
        return "partial"


class ProviderHealthStatus(BaseModel):
    """Health status for a single provider."""
    provider: str
    enabled: bool
    healthy: bool
    last_check_at: Optional[str] = None
    last_success_at: Optional[str] = None
    last_error: Optional[str] = None
    success_rate_1h: Optional[float] = None
    avg_latency_ms: Optional[float] = None
    total_requests_1h: int = 0
    rate_limited: bool = False
    credentials_configured: bool = True
    message: Optional[str] = None


class HealthCheckResult(BaseModel):
    """Overall MCP server health check response."""
    server_status: str = "healthy"
    server_version: str = ""
    providers: List[ProviderHealthStatus] = Field(default_factory=list)
    database_connected: bool = False
    cache_connected: bool = False
    uptime_seconds: Optional[float] = None
