"""
Unit tests for DeduplicationService and fingerprint hashing.
"""

from backend.python.mcp.job_discovery.models.normalized_job import NormalizedJob
from backend.python.mcp.job_discovery.services.deduplication import DeduplicationService


def test_fingerprint_deterministic_and_case_insensitive():
    job1 = NormalizedJob(
        source="jsearch/linkedin",
        source_job_id="1",
        title="  Principal Architect  ",
        company=" Acme Corp! ",
        location="Remote",
        description_raw="Desc 1",
        apply_url="https://example.com/apply/1",
    )

    job2 = NormalizedJob(
        source="jsearch/indeed",
        source_job_id="2",
        title="principal architect",
        company="acme corp",
        location="remote",
        description_raw="Desc 2",
        apply_url="https://example.com/apply/1",
    )

    fp1 = DeduplicationService.compute_fingerprint(job1)
    fp2 = DeduplicationService.compute_fingerprint(job2)
    assert fp1 == fp2


def test_deduplication_service_filters_duplicates():
    service = DeduplicationService()

    job1 = NormalizedJob(
        source="jsearch/linkedin",
        source_job_id="1",
        title="Lead Engineer",
        company="TechCorp",
        apply_url="https://techcorp.com/jobs/1",
        description_raw="Desc",
    )

    # Identical job aggregated under different publisher
    job2 = NormalizedJob(
        source="jsearch/ziprecruiter",
        source_job_id="js-99",
        title="Lead Engineer",
        company="TechCorp",
        apply_url="https://techcorp.com/jobs/1",
        description_raw="Desc from ziprecruiter",
    )

    # Distinct job
    job3 = NormalizedJob(
        source="jsearch/glassdoor",
        source_job_id="3",
        title="Staff Engineer",
        company="TechCorp",
        apply_url="https://techcorp.com/jobs/3",
        description_raw="Desc",
    )

    unique_jobs, removed_count = service.deduplicate([job1, job2, job3])
    assert removed_count == 1
    assert len(unique_jobs) == 2
    assert unique_jobs[0].fingerprint is not None
    assert unique_jobs[0].idempotency_key is not None
