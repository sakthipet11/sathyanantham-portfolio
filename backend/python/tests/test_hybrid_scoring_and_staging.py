import pytest
import asyncio
from backend.python.services.job_scoring_service import job_scoring_service
from backend.python.services.resume_matching_service import resume_matching_service
from backend.python.services.cover_letter_service import CoverLetterService

@pytest.mark.asyncio
async def test_hybrid_scoring_tier1_fast_gate():
    """Verify that low-relevance jobs are stopped at Tier 1 deterministic gate with zero latency."""
    low_fit_job = {
        "title": "Junior Chef Cook",
        "company": "Gourmet Bistro",
        "location": "Dallas, TX",
        "location_type": "Onsite",
        "description_raw": "Looking for a prep cook with culinary kitchen experience.",
        "requirements_clean": "Knife skills, kitchen safety."
    }
    result = await job_scoring_service.score_job(low_fit_job)
    assert result is not None
    assert result.get("overall_score", 0) < 70.0
    assert result.get("evaluation_tier") == "TIER_1_DETERMINISTIC_GATE"

@pytest.mark.asyncio
async def test_hybrid_scoring_high_fit_role():
    """Verify that high-fit role matching candidate profile passes Tier 1 and produces structured evaluation."""
    high_fit_job = {
        "title": "Lead Frontend Architect",
        "company": "Vercel",
        "location": "Remote",
        "location_type": "Remote",
        "description_raw": "Seeking a Lead Frontend Architect with 10+ years experience in React, TypeScript, Next.js, and Micro Frontends.",
        "requirements_clean": "React, TypeScript, Next.js, Micro Frontends, Module Federation, Design Systems."
    }
    result = await job_scoring_service.score_job(high_fit_job)
    assert result is not None
    assert result.get("overall_score", 0) >= 75.0
    assert "matching_keywords" in result
    assert any("react" in k.lower() or "typescript" in k.lower() for k in result.get("matching_keywords", []))

def test_resume_matching_for_job():
    """Verify resume matching service correctly pairs specialized candidate resume."""
    mfe_job = {
        "title": "Staff Micro Frontend Architect",
        "description_raw": "Module federation and micro frontend leadership."
    }
    matched = resume_matching_service.match_resume_for_job(mfe_job)
    assert matched is not None
    assert "resume_id" in matched
    assert "file_name" in matched

@pytest.mark.asyncio
async def test_cover_letter_service_generation():
    """Verify grounded cover letter service produces tailored letter grounded in candidate facts."""
    cl_service = CoverLetterService()
    job = {
        "title": "Lead Frontend Architect",
        "company": "Stripe",
        "description_raw": "Building high-performance design systems and frontend infrastructure."
    }
    res = await cl_service.generate_cover_letter(job)
    assert res is not None
    cl_text = res.get("cover_letter_text") or res.get("cover_letter") or ""
    assert len(cl_text) > 100
    assert "Sathyanantham" in cl_text
