from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from backend.python.repositories.email_repository import email_repository
from backend.python.services.recruiter_automation_service import recruiter_automation_service
from backend.python.repositories.resume_repository import resume_repository

router = APIRouter(prefix="/api/v2/recruiter-inbox", tags=["recruiter_inbox_v2"])

class InboundEmailWebhookRequest(BaseModel):
    gmail_message_id: Optional[str] = None
    thread_id: Optional[str] = None
    sender: str
    sender_name: Optional[str] = None
    company: Optional[str] = None
    subject: str
    body: str
    body_html: Optional[str] = None

class ApproveReplyRequest(BaseModel):
    approved_by: Optional[str] = "HUMAN_ADMIN"
    custom_reply_body: Optional[str] = None
    selected_resume_id: Optional[str] = None

class EditReplyRequest(BaseModel):
    draft_reply_body: str
    attached_resume_id: Optional[str] = None

class AutomationSettingsRequest(BaseModel):
    auto_reply_resume_requests: Optional[bool] = None
    min_confidence_auto_reply: Optional[float] = None
    require_review_for_all: Optional[bool] = None

@router.get("/metrics")
def get_inbox_metrics():
    """HUD Metrics for Recruiter Inbox"""
    return {"status": "success", "metrics": email_repository.get_email_metrics()}

@router.get("")
def list_inbox_emails(
    classification: Optional[str] = Query(None, description="Filter by classification e.g. INTERVIEW_REQUEST, RESUME_REQUEST, JOB_OFFER"),
    status: Optional[str] = Query(None, description="Filter by status e.g. DRAFT_READY, SENT, RECEIVED"),
    requires_review: Optional[bool] = Query(None, description="Filter by whether human review is required"),
    search: Optional[str] = Query(None, description="Search query across sender, company, subject"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Searchable & Filterable Recruiter Inbound Email Stream"""
    emails = email_repository.list_emails(
        classification=classification,
        status=status,
        requires_review=requires_review,
        search=search,
        limit=limit,
        offset=offset
    )
    return {
        "status": "success",
        "count": len(emails),
        "emails": emails
    }

@router.get("/{email_id}")
def get_email_details(email_id: str):
    em = email_repository.get_email_by_id(email_id)
    if not em:
        raise HTTPException(status_code=404, detail=f"Email {email_id} not found")
    
    audit_logs = email_repository.get_audit_logs(email_id)
    return {
        "status": "success",
        "email": em,
        "audit_logs": audit_logs
    }

@router.post("/sync")
async def sync_gmail_inbox(
    max_messages: int = Query(25, ge=1, le=100),
    since_days: int = Query(2, ge=1, le=30, description="Fetch emails received within the last N days (default: 2 days)")
):
    """
    Triggers live Gmail sync via IMAP to pull real incoming recruiter emails
    from the configured Gmail account and ingest them automatically into the database.
    """
    try:
        res = await recruiter_automation_service.sync_live_inbox(max_messages=max_messages, since_days=since_days)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gmail sync failed: {e}")

@router.post("/webhook")
async def ingest_inbound_email(req: InboundEmailWebhookRequest):
    """
    Ingests inbound email webhook (from Pub/Sub or live email triggers).
    Classifies intent, evaluates risks, stages draft reply, and matches tailored resume.
    """
    res = await recruiter_automation_service.process_inbound_email(req.dict())
    return res

@router.post("/{email_id}/approve-reply")
async def approve_reply(email_id: str, req: ApproveReplyRequest = Body(default=ApproveReplyRequest())):
    """
    Human Approval Gate:
    Authorizes sending of the draft reply with attached candidate resume PDF.
    """
    try:
        res = await recruiter_automation_service.approve_and_send_reply(
            email_id=email_id,
            approved_by=req.approved_by or "HUMAN_ADMIN",
            custom_reply_body=req.custom_reply_body,
            selected_resume_id=req.selected_resume_id
        )
        return res
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to approve reply: {err}")

@router.post("/{email_id}/edit-reply")
def edit_reply_draft(email_id: str, req: EditReplyRequest):
    em = email_repository.get_email_by_id(email_id)
    if not em:
        raise HTTPException(status_code=404, detail=f"Email {email_id} not found")
    
    updated = email_repository.update_email_status(
        email_id,
        status=em.get("status", "DRAFT_READY"),
        draft_reply_body=req.draft_reply_body,
        attached_resume_id=req.attached_resume_id
    )
    email_repository.log_audit(
        email_id,
        "DRAFT_EDITED",
        "HUMAN_ADMIN",
        f"Draft reply updated by administrator. Attached resume: {req.attached_resume_id or em.get('attached_resume_id')}."
    )
    return {"status": "success", "email": updated}

@router.post("/{email_id}/reject")
def reject_email_reply(email_id: str):
    em = email_repository.get_email_by_id(email_id)
    if not em:
        raise HTTPException(status_code=404, detail=f"Email {email_id} not found")
    
    updated = email_repository.update_email_status(email_id, status="REJECTED")
    email_repository.log_audit(email_id, "REPLY_DECLINED", "HUMAN_ADMIN", "Administrator declined to send a reply.")
    return {"status": "success", "email": updated}

@router.get("/settings/policy")
def get_automation_settings():
    return {
        "status": "success",
        "policy": recruiter_automation_service.automation_policy
    }

@router.post("/settings/policy")
def update_automation_settings(req: AutomationSettingsRequest):
    if req.auto_reply_resume_requests is not None:
        recruiter_automation_service.automation_policy["auto_reply_resume_requests"] = req.auto_reply_resume_requests
    if req.min_confidence_auto_reply is not None:
        recruiter_automation_service.automation_policy["min_confidence_auto_reply"] = req.min_confidence_auto_reply
    if req.require_review_for_all is not None:
        recruiter_automation_service.automation_policy["require_review_for_all"] = req.require_review_for_all

    return {
        "status": "success",
        "policy": recruiter_automation_service.automation_policy
    }

@router.post("/bulk-delete")
def bulk_delete_emails(payload: Dict[str, List[str]] = Body(...)):
    ids = payload.get("ids", [])
    if len(ids) > 500:
        raise HTTPException(status_code=400, detail="Bulk delete batch size exceeds limit of 500 IDs.")
    deleted_count = email_repository.delete_bulk(ids, actor="admin_user", action="MANUAL_DELETE")
    return {"status": "success", "pipeline": "emails", "requested_count": len(ids), "deleted_count": deleted_count}

@router.delete("/{email_id}")
def delete_email(email_id: str):
    deleted = email_repository.delete_by_id(email_id, actor="admin_user", action="MANUAL_DELETE")
    return {"status": "success", "message": f"Email {email_id} hard-deleted.", "deleted": deleted}
