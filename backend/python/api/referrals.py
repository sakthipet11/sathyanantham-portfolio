from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from backend.python.repositories.referral_repository import referral_repository
from backend.python.services.referral_discovery_service import referral_discovery_service
from backend.python.services.referral_messaging_service import referral_messaging_service
from backend.python.services.cover_letter_service import cover_letter_service
from backend.python.repositories.job_repository import job_repository

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
    return {"status": "success", "metrics": referral_repository.get_metrics()}

@router.get("")
def list_referral_opportunities(
    company: Optional[str] = Query(None, description="Filter by company name"),
    status: Optional[str] = Query(None, description="Filter by status e.g. READY_FOR_REVIEW, SENT, QUALIFIED, NO_CONTACT_FOUND"),
    min_score: Optional[int] = Query(None, ge=0, le=100),
    limit: int = Query(100, ge=1, le=200)
):
    referrals = referral_repository.list_referrals(company=company, status=status, min_score=min_score, limit=limit)
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
