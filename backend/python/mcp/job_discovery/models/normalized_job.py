"""
Pydantic v2 models for job discovery MCP server.
"""

from datetime import date, datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, HttpUrl, field_validator


class JobStatus(str, Enum):
    DISCOVERED = "DISCOVERED"
    SCORING = "SCORING"
    QUALIFIED = "QUALIFIED"
    REJECTED = "REJECTED"
    TAILORING = "TAILORING"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    APPROVED = "APPROVED"
    APPLYING = "APPLYING"
    APPLIED = "APPLIED"
    MANUAL_REQUIRED = "MANUAL_REQUIRED"
    FAILED = "FAILED"
    CLOSED = "CLOSED"


class LocationType(str, Enum):
    REMOTE = "Remote"
    HYBRID = "Hybrid"
    ONSITE = "Onsite"


class EmploymentType(str, Enum):
    FULL_TIME = "Full-time"
    PART_TIME = "Part-time"
    CONTRACT = "Contract"
    FREELANCE = "Freelance"
    INTERNSHIP = "Internship"


class NormalizedJob(BaseModel):
    """
    Canonical normalized job model — the MCP server's output shape.

    This model is what the MCP tools return. The existing job_repository
    maps this into the jobs table. Fields are intentionally a superset of
    the existing schema to allow for progressive enrichment.
    """

    # ── Identity ─────────────────────────────────────────────────────────
    source: str = Field(description="Provider name: remotive, adzuna, greenhouse, etc.")
    source_job_id: str = Field(description="Provider's unique job identifier")
    fingerprint: Optional[str] = Field(
        default=None,
        description="Canonical dedup hash: SHA256(company + norm_title + norm_location + apply_url)"
    )

    # ── Core Fields ──────────────────────────────────────────────────────
    title: str = Field(min_length=1, max_length=500)
    company: str = Field(min_length=1, max_length=300)
    location: Optional[str] = Field(default="Remote", max_length=500)
    location_type: LocationType = LocationType.REMOTE
    employment_type: EmploymentType = EmploymentType.FULL_TIME

    # ── Compensation ─────────────────────────────────────────────────────
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = "USD"

    # ── Description ──────────────────────────────────────────────────────
    description_raw: str = Field(min_length=1, description="Full job description text")
    requirements_clean: Optional[str] = None
    responsibilities: Optional[str] = None

    # ── Skills & Tech ────────────────────────────────────────────────────
    tech_stack: List[str] = Field(default_factory=list)

    # ── URLs ─────────────────────────────────────────────────────────────
    job_url: Optional[str] = None
    apply_url: str = Field(description="Direct application URL")

    # ── Metadata ─────────────────────────────────────────────────────────
    portal_type: str = Field(default="custom", description="greenhouse, lever, workday, custom, etc.")
    status: JobStatus = JobStatus.DISCOVERED
    posted_date: Optional[str] = None
    discovered_at: Optional[str] = None

    # ── Dedup Support ────────────────────────────────────────────────────
    idempotency_key: Optional[str] = Field(
        default=None,
        description="Computed by dedup service, not by provider"
    )

    # ── Manual Review ────────────────────────────────────────────────────
    manual_reason: Optional[str] = None

    # ── Provider Metadata ────────────────────────────────────────────────
    provider_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Raw provider-specific fields preserved for debugging"
    )

    @field_validator("title", "company")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if v else v

    def to_repository_dict(self) -> Dict[str, Any]:
        """
        Convert to the dict format expected by the existing job_repository.save_job().
        Maps NormalizedJob fields to the existing jobs table column names.
        """
        d = {
            "source": self.source,
            "external_job_id": self.source_job_id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "location_type": self.location_type.value if isinstance(self.location_type, LocationType) else self.location_type,
            "employment_type": self.employment_type.value if isinstance(self.employment_type, EmploymentType) else self.employment_type,
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "salary_currency": self.salary_currency,
            "description_raw": self.description_raw,
            "requirements_clean": self.requirements_clean,
            "responsibilities": self.responsibilities,
            "tech_stack": self.tech_stack,
            "job_url": self.job_url,
            "apply_url": self.apply_url,
            "portal_type": self.portal_type,
            "status": self.status.value if isinstance(self.status, JobStatus) else self.status,
            "posted_date": self.posted_date,
            "discovered_at": self.discovered_at,
            "idempotency_key": self.idempotency_key,
            "fingerprint": self.fingerprint,
        }
        if self.manual_reason:
            d["manual_reason"] = self.manual_reason
        return {k: v for k, v in d.items() if v is not None}

    model_config = {"use_enum_values": True, "str_strip_whitespace": True}
