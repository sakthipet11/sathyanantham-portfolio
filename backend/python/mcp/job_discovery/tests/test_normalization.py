"""
Unit tests for Job Discovery normalization and Pydantic models.
"""

import pytest
from backend.python.mcp.job_discovery.models.normalized_job import (
    NormalizedJob,
    LocationType,
    EmploymentType,
    JobStatus,
)


def test_normalized_job_instantiation_and_defaults():
    job = NormalizedJob(
        source="remotive",
        source_job_id="101",
        title="Lead Frontend Architect",
        company="NextGen Tech",
        description_raw="We need an expert in React, TypeScript, and Micro Frontends.",
        apply_url="https://example.com/apply/101",
    )

    assert job.source == "remotive"
    assert job.source_job_id == "101"
    assert job.title == "Lead Frontend Architect"
    assert job.company == "NextGen Tech"
    assert job.location == "Remote"
    assert job.location_type == LocationType.REMOTE
    assert job.employment_type == EmploymentType.FULL_TIME
    assert job.status == JobStatus.DISCOVERED
    assert job.salary_currency == "USD"


def test_to_repository_dict_mapping():
    job = NormalizedJob(
        source="adzuna",
        source_job_id="adz-99",
        title="Staff Engineer",
        company="Stripe",
        location="San Francisco, CA",
        location_type=LocationType.HYBRID,
        employment_type=EmploymentType.FULL_TIME,
        salary_min=180000.0,
        salary_max=240000.0,
        salary_currency="USD",
        description_raw="Staff UI Engineer description",
        tech_stack=["React", "TypeScript", "Next.js"],
        apply_url="https://stripe.com/jobs/99",
        posted_date="2026-08-19",
        idempotency_key="mock_idem_key",
        fingerprint="mock_fp_hash",
    )

    repo_dict = job.to_repository_dict()
    assert repo_dict["source"] == "adzuna"
    assert repo_dict["external_job_id"] == "adz-99"
    assert repo_dict["title"] == "Staff Engineer"
    assert repo_dict["company"] == "Stripe"
    assert repo_dict["location_type"] == "Hybrid"
    assert repo_dict["salary_min"] == 180000.0
    assert repo_dict["salary_max"] == 240000.0
    assert repo_dict["idempotency_key"] == "mock_idem_key"
    assert repo_dict["fingerprint"] == "mock_fp_hash"
