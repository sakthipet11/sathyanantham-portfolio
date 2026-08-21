import pytest
import asyncio
from backend.python.services.company_normalization_service import company_normalization_service
from backend.python.services.linkedin_contact_service import linkedin_contact_service
from backend.python.services.cover_letter_service import cover_letter_service
from backend.python.services.referral_discovery_service import referral_discovery_service
from backend.python.services.referral_ranking_service import referral_ranking_service
from backend.python.repositories.referral_repository import referral_repository
from backend.python.repositories.job_repository import job_repository

@pytest.mark.asyncio
async def test_company_normalization_aliases():
    """Verify corporate alias resolution and legal suffix stripping."""
    assert company_normalization_service.normalize("Google LLC") == "Google"
    assert company_normalization_service.normalize("Alphabet Inc.") == "Google"
    assert company_normalization_service.normalize("Meta Platforms, Inc.") == "Meta"
    assert company_normalization_service.normalize("Amazon Web Services") == "Amazon"
    assert company_normalization_service.normalize("Microsoft Corporation") == "Microsoft"
    assert company_normalization_service.normalize("Vercel Inc.") == "Vercel"
    assert company_normalization_service.normalize("Linear Orbit Inc") == "Linear"
    assert company_normalization_service.match_company("Google", "Google LLC") is True
    assert company_normalization_service.match_company("Meta Platforms", "Meta") is True
    assert company_normalization_service.match_company("AWS", "Amazon") is True

@pytest.mark.asyncio
async def test_linkedin_contact_hierarchy_ranking():
    """Verify 1st-degree connection priority, function priority, and seniority tiebreaker."""
    contacts = [
        {"person_name": "Junior Recruiter", "role": "Junior Sourcer", "department": "Recruiting", "seniority": "Junior", "connection_type": "PUBLIC_DIRECTORY"},
        {"person_name": "Eng VP", "role": "VP of Engineering", "department": "Engineering", "seniority": "VP", "connection_type": "1ST_DEGREE_LINKEDIN"},
        {"person_name": "Staff Eng 2nd", "role": "Staff Engineer", "department": "Engineering", "seniority": "Staff", "connection_type": "2ND_DEGREE"},
    ]
    ranked = linkedin_contact_service.rank_and_prioritize_contacts(contacts)
    # Highest ranked must be 1st-degree Eng VP
    assert ranked[0]["person_name"] == "Eng VP"
    assert ranked[0]["connection_type"] == "1ST_DEGREE_LINKEDIN"

@pytest.mark.asyncio
async def test_contact_enrichment_for_company():
    """Verify best contact identification and corporate email resolution."""
    contact = await linkedin_contact_service.find_and_enrich_best_contact("Figma", "Lead Frontend Architect")
    assert contact is not None
    assert contact["person_name"] in ["Marcus Vance", "Sarah Connor"]
    assert "figma.com" in contact["contact_email"]
    assert "https://linkedin.com" in contact["profile_url"]

@pytest.mark.asyncio
async def test_cover_letter_generation():
    """Verify tailored cover letter generation grounded in candidate facts."""
    job = {
        "title": "Principal UI Architect",
        "company": "Stripe",
        "description": "Leading distributed UI architecture and micro frontends at scale."
    }
    contact = {
        "person_name": "Elena Rostova",
        "role": "Staff Engineering Manager"
    }
    cl_res = await cover_letter_service.generate_cover_letter(job, contact)
    assert cl_res is not None
    assert "cover_letter_text" in cl_res
    text = cl_res["cover_letter_text"]
    assert "Sathyanantham" in text
    assert "Stripe" in text
    assert "13" in text or "Frontend" in text

@pytest.mark.asyncio
async def test_full_automated_referral_pipeline_execution():
    """Test full 7-step automated referral discovery & execution pipeline."""
    import uuid
    test_uuid = str(uuid.uuid4())
    # 1. Seed a high-ATS job (ATS 95)
    seed_job = {
        "id": test_uuid,
        "title": "Lead UI Platform Architect",
        "company": "Figma LLC",
        "match_score": 95.0,
        "ats_score": 95,
        "description": "Architecting design systems and micro frontend platforms in TypeScript."
    }
    job_repository.save_job(seed_job)

    # 2. Trigger automated discovery
    discovered = await referral_discovery_service.discover_referral_opportunities(threshold=90)
    assert len(discovered) > 0

    # 3. Find discovered referral
    target_ref = next((r for r in discovered if r.get("status") == "READY_FOR_REVIEW" and r.get("contact_email")), discovered[0])
    assert target_ref is not None

    # 4. Human Approval Gate
    approved_res = referral_discovery_service.approve_referral(target_ref["id"], approved_by="TEST_ADMIN")
    assert approved_res["status"] == "SUCCESS"
    assert approved_res["referral"]["status"] == "APPROVED"

    # 5. Send Outreach via SMTP (with attachments)
    send_res = await referral_discovery_service.send_referral(
        referral_id=target_ref["id"],
        custom_email=target_ref.get("contact_email") or "marcus.vance@figma.com",
        sent_by="TEST_ADMIN"
    )
    assert send_res["status"] == "SENT"
    assert send_res["referral"]["status"] == "SENT"
    assert send_res["referral"]["follow_up_due_at"] is not None
    assert send_res["referral"]["follow_up_status"] == "PENDING"
    assert send_res["referral"]["follow_up_status"] == "PENDING"
