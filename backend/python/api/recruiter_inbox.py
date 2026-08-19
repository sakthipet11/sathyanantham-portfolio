from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body, Header
from pydantic import BaseModel
from backend.python.repositories.email_repository import email_repository
from backend.python.services.recruiter_automation_service import recruiter_automation_service

router = APIRouter(prefix="/api/v2/recruiter-inbox", tags=["recruiter_inbox_v2"])

class InboundEmailWebhookRequest(BaseModel):
    gmail_message_id: Optional[str] = None
    thread_id: Optional[str] = None
    sender: str
    sender_name: Optional[str] = None
    company: Optional[str] = None
    subject: str
    body: str

class ApproveReplyRequest(BaseModel):
    approved_by: Optional[str] = "HUMAN_ADMIN"
    custom_reply_body: Optional[str] = None

class EditReplyRequest(BaseModel):
    draft_reply_body: str

@router.get("/metrics")
def get_inbox_metrics():
    """HUD Metrics for Recruiter Inbox"""
    return {"status": "success", "metrics": email_repository.get_email_metrics()}

@router.get("")
def list_inbox_emails(
    classification: Optional[str] = Query(None, description="Filter by classification e.g. INTERVIEW_REQUEST, RESUME_REQUEST, OFFER"),
    status: Optional[str] = Query(None, description="Filter by status e.g. DRAFT_READY, SENT, RECEIVED"),
    limit: int = Query(50, ge=1, le=100)
):
    emails = email_repository.list_emails(classification=classification, status=status, limit=limit)
    return {"status": "success", "count": len(emails), "emails": emails}

@router.get("/{email_id}")
def get_email_details(email_id: str):
    em = email_repository.get_email_by_id(email_id)
    if not em:
        raise HTTPException(status_code=404, detail=f"Email {email_id} not found")
    return {"status": "success", "email": em}

@router.post("/webhook")
async def ingest_inbound_email(req: InboundEmailWebhookRequest):
    """
    Ingests inbound email webhook (from Pub/Sub / Gmail push).
    Classifies intent, evaluates risks, stages draft reply, and notifies dashboard.
    """
    res = await recruiter_automation_service.process_inbound_email(req.dict())
    return res

@router.post("/{email_id}/approve-reply")
async def approve_reply(email_id: str, req: ApproveReplyRequest = Body(default=ApproveReplyRequest())):
    """
    Human Approval Gate:
    Authorizes sending of the draft reply via Gmail MCP.
    """
    try:
        res = await recruiter_automation_service.approve_and_send_reply(
            email_id=email_id,
            approved_by=req.approved_by or "HUMAN_ADMIN",
            custom_reply_body=req.custom_reply_body
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
    
    updated = email_repository.update_email_status(email_id, status=em.get("status", "DRAFT_READY"), draft_reply_body=req.draft_reply_body)
    email_repository.log_audit(email_id, "DRAFT_EDITED", "HUMAN_ADMIN", "Draft reply body updated by administrator.")
    return {"status": "success", "email": updated}

@router.post("/{email_id}/reject")
def reject_email_reply(email_id: str):
    em = email_repository.get_email_by_id(email_id)
    if not em:
        raise HTTPException(status_code=404, detail=f"Email {email_id} not found")
    
    updated = email_repository.update_email_status(email_id, status="REJECTED")
    email_repository.log_audit(email_id, "REPLY_DECLINED", "HUMAN_ADMIN", "Administrator declined to send a reply.")
    return {"status": "success", "email": updated}

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
