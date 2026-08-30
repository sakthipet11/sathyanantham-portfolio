from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from backend.python.repositories.referral_repository import referral_repository
from backend.python.services.referral_discovery_service import referral_discovery_service
from backend.python.services.referral_messaging_service import referral_messaging_service
from backend.python.services.cover_letter_service import cover_letter_service
from backend.python.repositories.job_repository import job_repository

from backend.python.repositories.connection_repository import connection_repository
from backend.python.services.apify_recruiter_service import apify_recruiter_service
from backend.python.services.company_normalization_service import company_normalization_service

router = APIRouter(prefix="/api/v2/referrals", tags=["referrals_v2"])

class GenerateMessageRequest(BaseModel):
    include_twin_demo: bool = True

class EditMessageRequest(BaseModel):
    message: str
    subject: Optional[str] = None

class UpdateReferralDetailsRequest(BaseModel):
    contact_email: Optional[str] = None
    subject: Optional[str] = None
    message: Optional[str] = None
    cover_letter_text: Optional[str] = None
    resume_id: Optional[str] = None

class ResolveEmailRequest(BaseModel):
    company: Optional[str] = None
    company_domain: Optional[str] = None
    job_id: Optional[str] = None
    referral_id: Optional[str] = None

class ApproveOutreachRequest(BaseModel):
    approved_by: Optional[str] = "HUMAN_ADMIN"

class SendOutreachRequest(BaseModel):
    custom_message: Optional[str] = None
    custom_email: Optional[str] = None
    sent_by: Optional[str] = "HUMAN_ADMIN"

class NudgeRequest(BaseModel):
    custom_nudge_message: Optional[str] = None
    sent_by: Optional[str] = "HUMAN_ADMIN"

@router.get("/metrics")
def get_referral_metrics():
    """HUD Metrics for Referral Opportunities"""
    return referral_repository.get_metrics()

@router.get("")
async def list_referral_opportunities(
    company: Optional[str] = Query(None, description="Filter by company name"),
    status: Optional[str] = Query(None, description="Filter by status e.g. READY_FOR_REVIEW, SENT, QUALIFIED, NO_CONTACT_FOUND"),
    min_score: Optional[int] = Query(None, ge=0, le=100),
    limit: int = Query(100, ge=1, le=200),
    auto_sync: bool = Query(False, description="Whether to trigger discovery sync")
):
    clean_comp = company if isinstance(company, str) else None
    clean_status = status if isinstance(status, str) else None
    clean_min = min_score if isinstance(min_score, int) else None
    clean_limit = int(limit) if isinstance(limit, (int, str)) and str(limit).isdigit() else 100
    clean_sync = bool(auto_sync) if isinstance(auto_sync, bool) else False

    referrals = referral_repository.list_referrals(company=clean_comp, status=clean_status, min_score=clean_min, limit=clean_limit)
    if not referrals or clean_sync:
        try:
            discovered = await referral_discovery_service.discover_referral_opportunities(threshold=90)
            if discovered:
                referrals = referral_repository.list_referrals(company=clean_comp, status=clean_status, min_score=clean_min, limit=clean_limit)
        except Exception as e:
            print(f"[REFERRAL_API] Notice during auto-sync from qualified jobs: {e}")

    # Ensure every referral record has contact_email resolved from connections table or domain
    for ref in referrals:
        if not ref.get("contact_email"):
            comp = ref.get("company", "")
            conns = connection_repository.find_connections_by_company(comp)
            best_c = next((c for c in conns if c.get("email")), None)
            if best_c:
                ref["contact_email"] = best_c["email"]
                if best_c.get("full_name"):
                    ref["person_name"] = best_c["full_name"]
            else:
                comp_dom = ref.get("company_domain") or apify_recruiter_service.extract_domain(comp)
                if comp_dom:
                    ref["contact_email"] = f"careers@{comp_dom}"
            referral_repository.update_referral(ref["id"], {"contact_email": ref["contact_email"]})

    return {"status": "success", "count": len(referrals), "referrals": referrals}

@router.get("/{referral_id}")
def get_referral_details(referral_id: str):
    ref = referral_repository.get_referral_by_id(referral_id)
    if not ref:
        raise HTTPException(status_code=404, detail=f"Referral opportunity {referral_id} not found")
    return {"status": "success", "referral": ref}

@router.post("/discover")
async def trigger_referral_discovery(threshold: Optional[int] = Query(90, ge=70, le=100)):
    """
    Scans qualified jobs (ATS >= threshold) and discovers potential referral contacts.
    Prioritizes 1st-degree LinkedIn connections, enriches emails, generates tailored materials.
    """
    discovered = await referral_discovery_service.discover_referral_opportunities(threshold=threshold)
    return {
        "status": "success",
        "message": f"Referral discovery complete for jobs with ATS >= {threshold}.",
        "newly_discovered_count": len(discovered),
        "referrals": discovered
    }

@router.post("/resolve-email")
@router.post("/{referral_id}/resolve-email")
async def resolve_referral_recipient_email(
    referral_id: Optional[str] = None,
    req: Optional[ResolveEmailRequest] = Body(default=None)
):
    """
    Resolves recipient email:
    1. Looks up in Connections table for matching company with email.
    2. If not found in Connections table, calls Apify with company domain to extract HR/recruiter details.
    3. Saves discovered recruiter into Connections table (in Supabase).
    4. Updates the referral record with the verified contact email and details.
    5. Returns email and contact details to update UI immediately.
    """
    ref_id = referral_id or (req.referral_id if req else None)
    ref = referral_repository.get_referral_by_id(ref_id) if ref_id else None

    company = (req.company if req and req.company else None) or (ref.get("company") if ref else "")
    job_id = (req.job_id if req and req.job_id else None) or (ref.get("job_id") if ref else None)

    job = job_repository.get_job_by_id(job_id) if job_id else None
    company_domain = (
        (req.company_domain if req and req.company_domain else None)
        or (job.get("company_domain") if job else None)
        or (ref.get("company_domain") if ref else None)
    )

    norm_company = company_normalization_service.normalize(company) if company else company

    # Step 1: Check Connections table
    conns = connection_repository.find_connections_by_company(norm_company)
    best_conn = None
    if conns:
        with_email = [c for c in conns if c.get("email")]
        if with_email:
            recruiters = [c for c in with_email if any(k in (c.get("position") or "").lower() for k in ["recruiter", "talent", "hr", "people", "sourcer"])]
            best_conn = recruiters[0] if recruiters else with_email[0]
        else:
            best_conn = conns[0]

    if best_conn and best_conn.get("email"):
        resolved_email = best_conn["email"]
        contact_name = best_conn.get("full_name") or f"{best_conn.get('first_name', '')} {best_conn.get('last_name', '')}".strip()
        contact_role = best_conn.get("position") or "Company Connection"
        profile_url = best_conn.get("linkedin_url")
        source = "CONNECTIONS_TABLE"
    else:
        # Step 2: Not in connections table -> Call Apify with company domain
        clean_domain = company_domain or apify_recruiter_service.extract_domain(norm_company or company)
        apify_res = await apify_recruiter_service.get_precise_hr_details(
            company_name=norm_company or company,
            company_domain=clean_domain,
            location=(job.get("location") if job else "India"),
            job_url=(job.get("apply_url") if job else None)
        )
        recruiter = apify_res.get("recruiter") or {}
        resolved_email = recruiter.get("email") or f"careers@{clean_domain}"
        contact_name = recruiter.get("full_name") or recruiter.get("name") or "Talent Acquisition Team"
        contact_role = recruiter.get("position") or recruiter.get("title") or "Talent Acquisition & Hiring Team"
        profile_url = recruiter.get("linkedin_url") or recruiter.get("profile_url")
        source = "APIFY_HR_DISCOVERY"

    # Step 3: Update Referral record in repository and Supabase
    if ref_id:
        referral_repository.update_referral(
            referral_id=ref_id,
            updates={
                "contact_email": resolved_email,
                "person_name": contact_name,
                "contact_name": contact_name,
                "role": contact_role,
                "profile_url": profile_url,
                "contact_linkedin": profile_url,
                "connection_type": "1ST_DEGREE_LINKEDIN" if source == "CONNECTIONS_TABLE" else "Recruiter"
            }
        )

    return {
        "status": "success",
        "email": resolved_email,
        "contact_email": resolved_email,
        "person_name": contact_name,
        "role": contact_role,
        "profile_url": profile_url,
        "source": source,
        "company": company,
        "company_domain": company_domain
    }

@router.post("/{referral_id}/generate-message")
async def generate_message_for_referral(referral_id: str, req: GenerateMessageRequest = Body(default=GenerateMessageRequest())):
    ref = referral_repository.get_referral_by_id(referral_id)
    if not ref:
        raise HTTPException(status_code=404, detail=f"Referral {referral_id} not found")

    job = job_repository.get_job_by_id(ref.get("job_id", "")) or {
        "id": ref.get("job_id"),
        "title": ref.get("job_title", "Engineering Role"),
        "company": ref.get("company"),
        "description_raw": ref.get("job_description", "")
    }

    msg_res = await referral_messaging_service.generate_message(
        job=job,
        contact=ref,
        include_twin_demo=req.include_twin_demo
    )

    updated = referral_repository.update_referral(
        referral_id=referral_id,
        updates={
            "status": "READY_FOR_REVIEW",
            "message": msg_res["body"],
            "subject": msg_res.get("subject", ref.get("subject"))
        }
    )
    referral_repository.log_audit(
        referral_id=referral_id,
        event_type="MESSAGE_GENERATED",
        actor="REFERRAL_AI_AGENT",
        details=f"Personalized outreach message generated ({msg_res.get('generated_by', 'AI')})."
    )
    return {"status": "success", "referral": updated}

@router.post("/{referral_id}/generate-cover-letter")
async def generate_cover_letter_for_referral(referral_id: str):
    ref = referral_repository.get_referral_by_id(referral_id)
    if not ref:
        raise HTTPException(status_code=404, detail=f"Referral {referral_id} not found")

    job = job_repository.get_job_by_id(ref.get("job_id", "")) or {
        "id": ref.get("job_id"),
        "title": ref.get("job_title", "Engineering Role"),
        "company": ref.get("company"),
        "description_raw": ref.get("job_description", "")
    }

    cl_res = await cover_letter_service.generate_cover_letter(job=job, contact=ref)
    
    # Update attachments
    attachments = ref.get("attachments") or []
    # Replace or append cover letter
    attachments = [a for a in attachments if a.get("type") != "COVER_LETTER_TXT"]
    attachments.append({
        "type": "COVER_LETTER_TXT",
        "name": cl_res["file_name"],
        "path": cl_res["file_path"],
        "download_url": f"/downloads/cover_letters/{cl_res['file_name']}"
    })

    updated = referral_repository.update_referral(
        referral_id=referral_id,
        updates={
            "cover_letter_text": cl_res["cover_letter_text"],
            "cover_letter_path": cl_res["file_path"],
            "attachments": attachments
        }
    )
    return {"status": "success", "cover_letter": cl_res, "referral": updated}

@router.post("/{referral_id}/update-details")
def update_referral_details(referral_id: str, req: UpdateReferralDetailsRequest):
    ref = referral_repository.get_referral_by_id(referral_id)
    if not ref:
        raise HTTPException(status_code=404, detail=f"Referral {referral_id} not found")

    updates = {}
    if req.contact_email is not None:
        updates["contact_email"] = req.contact_email
    if req.subject is not None:
        updates["subject"] = req.subject
    if req.message is not None:
        updates["message"] = req.message
    if req.cover_letter_text is not None:
        updates["cover_letter_text"] = req.cover_letter_text
    if req.resume_id is not None:
        updates["resume_id"] = req.resume_id

    updated = referral_repository.update_referral(referral_id=referral_id, updates=updates)
    referral_repository.log_audit(
        referral_id=referral_id,
        event_type="REFERRAL_DETAILS_UPDATED",
        actor="HUMAN_ADMIN",
        details="Referral details (email / message / cover letter) customized by administrator."
    )
    return {"status": "success", "referral": updated}

@router.post("/{referral_id}/edit-message")
def edit_referral_message(referral_id: str, req: EditMessageRequest):
    ref = referral_repository.get_referral_by_id(referral_id)
    if not ref:
        raise HTTPException(status_code=404, detail=f"Referral {referral_id} not found")

    updates = {"message": req.message}
    if req.subject:
        updates["subject"] = req.subject

    updated = referral_repository.update_referral(referral_id=referral_id, updates=updates)
    referral_repository.log_audit(
        referral_id=referral_id,
        event_type="MESSAGE_EDITED",
        actor="HUMAN_ADMIN",
        details="Referral outreach message customized by administrator."
    )
    return {"status": "success", "referral": updated}

@router.post("/{referral_id}/approve")
def approve_referral_outreach(referral_id: str, req: ApproveOutreachRequest = Body(default=ApproveOutreachRequest())):
    """Human Approval Gate for referral outreach message."""
    try:
        res = referral_discovery_service.approve_referral(referral_id=referral_id, approved_by=req.approved_by or "HUMAN_ADMIN")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{referral_id}/send")
async def send_referral_outreach(referral_id: str, req: SendOutreachRequest = Body(default=SendOutreachRequest())):
    """Dispatches referral email via SMTP with tailored resume and cover letter attached."""
    try:
        res = await referral_discovery_service.send_referral(
            referral_id=referral_id,
            custom_message=req.custom_message,
            custom_email=req.custom_email,
            sent_by=req.sent_by or "HUMAN_ADMIN"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch referral via SMTP: {e}")

@router.post("/{referral_id}/nudge")
async def nudge_referral_outreach(referral_id: str, req: NudgeRequest = Body(default=NudgeRequest())):
    """Sends a polite follow-up nudge email if no response after N days."""
    try:
        res = await referral_discovery_service.nudge_referral(
            referral_id=referral_id,
            custom_nudge_message=req.custom_nudge_message,
            sent_by=req.sent_by or "HUMAN_ADMIN"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send follow-up nudge: {e}")

@router.post("/{referral_id}/skip")
def skip_referral_opportunity(referral_id: str):
    ref = referral_repository.get_referral_by_id(referral_id)
    if not ref:
        raise HTTPException(status_code=404, detail=f"Referral {referral_id} not found")

    updated = referral_repository.update_referral_status(referral_id=referral_id, status="DECLINED")
    referral_repository.log_audit(
        referral_id=referral_id,
        event_type="REFERRAL_SKIPPED",
        actor="HUMAN_ADMIN",
        details="Referral outreach declined/skipped by administrator."
    )
    return {"status": "success", "referral": updated}

@router.post("/bulk-delete")
def bulk_delete_referrals(payload: Dict[str, List[str]] = Body(...)):
    ids = payload.get("ids", [])
    if len(ids) > 500:
        raise HTTPException(status_code=400, detail="Bulk delete batch size exceeds limit of 500 IDs.")
    deleted_count = referral_repository.delete_bulk(ids, actor="admin_user", action="MANUAL_DELETE")
    return {"status": "success", "pipeline": "referrals", "requested_count": len(ids), "deleted_count": deleted_count}

@router.delete("/{referral_id}")
def delete_referral(referral_id: str):
    deleted = referral_repository.delete_by_id(referral_id, actor="admin_user", action="MANUAL_DELETE")
    return {"status": "success", "message": f"Referral {referral_id} hard-deleted.", "deleted": deleted}
