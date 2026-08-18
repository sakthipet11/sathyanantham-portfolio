from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body, Header
from pydantic import BaseModel
from backend.python.repositories.application_repository import application_repository
from backend.python.services.application_automation_service import application_automation_service

router = APIRouter(prefix="/api/v2/applications", tags=["applications_v2"])

class PrepareApplicationRequest(BaseModel):
    job_id: str
    resume_version_id: Optional[str] = "resume-v2026-sathya-architect"

class ApprovalRequest(BaseModel):
    approved_by: Optional[str] = "HUMAN_ADMIN"
    notes: Optional[str] = None

class ManualCompleteRequest(BaseModel):
    notes: Optional[str] = None

@router.get("/metrics")
def get_application_metrics():
    """HUD Metrics for Application Automation Center"""
    return {"status": "success", "metrics": application_repository.get_application_metrics()}

@router.get("")
def list_applications(
    status: Optional[str] = Query(None, description="Filter by status e.g. READY_FOR_REVIEW, APPROVED, SUBMITTED, MANUAL_REQUIRED"),
    limit: int = Query(50, ge=1, le=100)
):
    apps = application_repository.list_applications(status=status, limit=limit)
    return {"status": "success", "count": len(apps), "applications": apps}

@router.get("/{application_id}")
def get_application_details(application_id: str):
    app = application_repository.get_application_by_id(application_id)
    if not app:
        raise HTTPException(status_code=404, detail=f"Application {application_id} not found")
    
    events = application_repository.get_events_for_application(application_id)
    return {
        "status": "success",
        "application": app,
        "events": events
    }

@router.post("/prepare")
async def prepare_application(req: PrepareApplicationRequest):
    """
    Triggers Stage 1 Application Automation:
    - Form field extraction & semantic mapping
    - Anti-bot / CAPTCHA sentinel check
    - Unknown question safety gating
    - Staging in READY_FOR_REVIEW
    """
    try:
        res = await application_automation_service.prepare_application(
            job_id=req.job_id,
            resume_version_id=req.resume_version_id
        )
        return res
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to prepare application: {err}")

@router.post("/{application_id}/approve")
async def approve_and_submit(application_id: str, req: ApprovalRequest = Body(default=ApprovalRequest())):
    """
    Triggers Stage 2 Human Approval Gate:
    - Verifies human approval
    - Transitions through SUBMITTING to SUBMITTED
    - Attaches confirmation number
    """
    try:
        res = await application_automation_service.submit_application_with_approval(
            application_id=application_id,
            approved_by=req.approved_by or "HUMAN_ADMIN",
            notes=req.notes
        )
        return res
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to approve submission: {err}")

@router.post("/{application_id}/reject")
def reject_application(application_id: str, req: ApprovalRequest = Body(default=ApprovalRequest())):
    app = application_repository.get_application_by_id(application_id)
    if not app:
        raise HTTPException(status_code=404, detail=f"Application {application_id} not found")
    
    application_repository.log_event(application_id, "APPLICATION_REJECTED", f"Application rejected by human reviewer. Reason: {req.notes or 'Declined target opportunity'}")
    updated = application_repository.update_application_status(application_id, "REJECTED", notes=req.notes)
    return {"status": "success", "application": updated}

@router.post("/{application_id}/manual-complete")
def mark_manually_completed(application_id: str, req: ManualCompleteRequest = Body(default=ManualCompleteRequest())):
    app = application_repository.get_application_by_id(application_id)
    if not app:
        raise HTTPException(status_code=404, detail=f"Application {application_id} not found")
    
    application_repository.log_event(application_id, "APPLICATION_SUBMITTED_MANUALLY", f"Human completed application manually via browser. Notes: {req.notes or 'Completed'}")
    updated = application_repository.update_application_status(application_id, "SUBMITTED", notes=req.notes)
    return {"status": "success", "application": updated}
