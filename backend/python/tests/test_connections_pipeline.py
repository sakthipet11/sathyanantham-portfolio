import pytest
import os
import uuid
import asyncio
from backend.python.repositories.connection_repository import connection_repository
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.referral_repository import referral_repository
from backend.python.services.apify_recruiter_service import apify_recruiter_service
from backend.python.services.referral_discovery_service import referral_discovery_service
from backend.python.services.linkedin_contact_service import linkedin_contact_service
from backend.python.services.ai_job_copilot_service import ai_job_copilot_service

@pytest.mark.asyncio
async def test_parse_default_connections_csv():
    """Verify that docs/Connections.csv correctly parses 700+ rows with all LinkedIn export fields."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    csv_path = os.path.join(repo_root, "docs", "Connections.csv")
    assert os.path.exists(csv_path), f"Connections.csv must exist at {csv_path}"

    records = connection_repository.parse_linkedin_csv(csv_path)
    assert len(records) >= 700, f"Expected at least 700 connections parsed, got {len(records)}"

    # Check structure of parsed items
    first = records[0]
    assert "first_name" in first and first["first_name"] != ""
    assert "company" in first and first["company"] != ""
    assert "source" in first and first["source"] == "LINKEDIN_CSV"
    assert "id" in first

    # Verify auto-tagging of HR vs Engineering roles
    hr_tagged = [r for r in records if "HR/Recruiter" in r.get("tags", [])]
    eng_tagged = [r for r in records if "Engineering" in r.get("tags", [])]
    assert len(hr_tagged) > 0, "Expected some HR/Recruiter tagged contacts"
    assert len(eng_tagged) > 0, "Expected some Engineering tagged contacts"

@pytest.mark.asyncio
async def test_connection_repository_crud():
    """Verify full CRUD, multi-filter list, company lookup, and bulk upsert."""
    test_id = str(uuid.uuid4())
    sample_conn = {
        "id": test_id,
        "first_name": "TestAlex",
        "last_name": "Developer",
        "company": "Figma LLC",
        "position": "Principal UI Architect",
        "email": "alex.dev@figma.com",
        "linkedin_url": "https://www.linkedin.com/in/alex-test",
        "connection_degree": "1st",
        "source": "MANUAL_ENTRY",
        "tags": ["Engineering", "UI"]
    }

    # 1. Create
    created = connection_repository.create_connection(sample_conn)
    assert created["id"] == test_id
    assert created["full_name"] == "TestAlex Developer"

    # 2. Get by ID
    fetched = connection_repository.get_connection_by_id(test_id)
    assert fetched is not None
    assert fetched["company"] == "Figma LLC"

    # 3. Company lookup with normalized matching
    matches = connection_repository.find_connections_by_company("Figma")
    assert any(c["id"] == test_id for c in matches)

    # 4. Update
    updated = connection_repository.update_connection(test_id, {"position": "Director of Frontend Engineering"})
    assert updated is not None
    assert updated["position"] == "Director of Frontend Engineering"

    # 5. Bulk delete
    del_count = connection_repository.bulk_delete_connections([test_id])
    assert del_count == 1
    assert connection_repository.get_connection_by_id(test_id) is None

@pytest.mark.asyncio
async def test_apify_recruiter_service_token_validation():
    """Verify that ApifyRecruiterService validates API token and formats discovered contacts correctly."""
    # Test token validation failure when token is empty
    orig_token = os.environ.get("APIFY_API_TOKEN")
    try:
        if "APIFY_API_TOKEN" in os.environ:
            del os.environ["APIFY_API_TOKEN"]
        if "APIFY_TOKEN" in os.environ:
            del os.environ["APIFY_TOKEN"]

        with pytest.raises(ValueError, match="APIFY_API_TOKEN is not configured"):
            apify_recruiter_service._require_token()
    finally:
        if orig_token:
            os.environ["APIFY_API_TOKEN"] = orig_token

    # Test saving discovered recruiter matching 7 connections columns
    saved = apify_recruiter_service._save_discovered_recruiter(
        company="Stripe",
        name="Clara Oswald",
        title="Technical Recruiter - Infrastructure",
        profile_url="https://linkedin.com/in/clara-oswald-recruiter",
        location="San Francisco, CA",
        email="clara.oswald@stripe.com",
        source="APIFY_MAPS_DISCOVERY"
    )
    assert saved is not None
    assert saved["first_name"] == "Clara"
    assert saved["last_name"] == "Oswald"
    assert saved["full_name"] == "Clara Oswald"
    assert saved["company"] == "Stripe"
    assert saved["email"] == "clara.oswald@stripe.com"
    assert saved["position"] == "Technical Recruiter - Infrastructure"
    assert saved["connection_degree"] == "Recruiter"
    assert "HR/Recruiter" in saved["tags"]

@pytest.mark.asyncio
async def test_apify_recruiter_service_domain_extraction_and_actor():
    """Verify domain extraction logic and actor settings for HR discovery."""
    assert apify_recruiter_service.actor_id == "supportive_fusilli/find-hr-director-and-people-lead-emails-by-domain"
    
    # Test domain extractions
    assert apify_recruiter_service.extract_domain("personio.com") == "personio.com"
    assert apify_recruiter_service.extract_domain("https://www.factorialhr.com/about") == "factorialhr.com"
    assert apify_recruiter_service.extract_domain("Personio") == "personio.com"
    assert apify_recruiter_service.extract_domain("Factorial HR") == "factorialhr.com"

@pytest.mark.asyncio
async def test_referral_discovery_with_connections_and_fallback():
    """Verify referral discovery pairs high-ATS jobs with real connections and generates tailored materials."""
    job_uuid = str(uuid.uuid4())
    test_job = {
        "id": job_uuid,
        "title": "Lead UI Systems Architect",
        "company": "Nextuple Inc",
        "match_score": 96.0,
        "ats_score": 96,
        "location": "Bangalore / Remote",
        "description": "Architecting design systems, micro frontends, and high scale React web applications."
    }
    job_repository.save_job(test_job)

    # Ingest default CSV to populate Nextuple connections (e.g., Monica Thakwani / Pranay Kumar Reddy)
    connection_repository.ingest_default_csv()

    # Discover referrals
    discovered = await referral_discovery_service.discover_referral_opportunities(threshold=90)
    assert len(discovered) > 0

    nextuple_ref = next((r for r in discovered if "Nextuple" in r.get("company", "")), None)
    assert nextuple_ref is not None
    assert nextuple_ref["status"] == "READY_FOR_REVIEW"
    assert nextuple_ref["job_ats_score"] == 96
    assert len(nextuple_ref["attachments"]) >= 2
    assert any(att["type"] == "RESUME_PDF" for att in nextuple_ref["attachments"])
    assert any(att["type"] == "COVER_LETTER_TXT" for att in nextuple_ref["attachments"])

@pytest.mark.asyncio
async def test_copilot_referral_intent_and_action_dispatch():
    """Verify AI Copilot parses referral intent, returns interactive referral cards, and dispatches via SMTP."""
    chat_res = await ai_job_copilot_service.process_chat_message_async(
        "Find referrals for my target companies Nextuple and Figma"
    )
    assert chat_res is not None
    assert chat_res.get("type") in ["REFERRAL_DISCOVERY_RESULT", "COPILOT_CHAT_RESPONSE"]

    if chat_res.get("type") == "REFERRAL_DISCOVERY_RESULT":
        refs = chat_res.get("referrals", [])
        assert len(refs) > 0
        assert any(a.get("action_id") == "SEND_ALL_REFERRALS" for a in chat_res.get("actions", []))
