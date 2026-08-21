from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body, Header, Depends
from pydantic import BaseModel
from backend.python.models.pydantic_models import (
    JDSearchRequest, AutomationSettingsUpdate, AutomationSettingsModel
)
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.supabase_repo import db_helper
from backend.python.services.job_discovery_service import job_discovery_service
from backend.python.services.job_scoring_service import job_scoring_service

router = APIRouter(tags=["jobs_v2"])

class StatusUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = None

class DiscoveryTriggerRequest(BaseModel):
    target_role: Optional[str] = None
    triggered_by: Optional[str] = "MANUAL_ADMIN"

# ============================================================================
# 1. Cloud Scheduler & Automation Discovery Endpoints
# ============================================================================
@router.post("/api/automation/jobs/discover")
async def trigger_automated_job_discovery(req: DiscoveryTriggerRequest = Body(default=DiscoveryTriggerRequest())):
    """
    Daily Job Discovery Pipeline (Use Case 1: Profile ↔ Job ATS >= 75%).
    Discovers jobs based on configured locations, remote preference, roles, and recency.
    """
    result = await job_discovery_service.run_discovery_pipeline(
        target_role=req.target_role,
        triggered_by=req.triggered_by or "CLOUD_SCHEDULER"
    )
    return result

# ============================================================================
# 2. Search Jobs Using a Reference Job Description (Use Case 2: JD Match >= 50%)
# ============================================================================
@router.post("/api/v2/jobs/search-by-jd")
async def search_jobs_by_jd(req: JDSearchRequest):
    """
    JD-Based Search:
    Extracts skills/role from reference JD, searches multi-portal sources,
    and runs AI semantic comparison (Match >= 50%).
    """
    if not req.jd_text or len(req.jd_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Please provide a valid Job Description with at least 10 characters.")

    result = await job_discovery_service.search_jobs_by_jd(
        jd_text=req.jd_text,
        custom_threshold=req.custom_threshold,
        limit=req.limit or 30
    )
    return result

# ============================================================================
# 3. Job Discovery Settings Endpoints
# ============================================================================
@router.get("/api/v2/jobs/settings")
def get_job_discovery_settings():
    """Returns the current job discovery settings (the single source of truth)."""
    settings = db_helper.get_automation_settings()
    return {
        "status": "success",
        "settings": settings
    }

@router.put("/api/v2/jobs/settings")
def update_job_discovery_settings(req: AutomationSettingsUpdate):
    """Updates job discovery configuration (locations, remote, roles, recency, thresholds)."""
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    res = db_helper.update_automation_settings(update_data)
    return res

# ============================================================================
# 4. Job Discovery & ATS Radar API Endpoints
# ============================================================================
@router.get("/api/v2/jobs/metrics")
def get_jobs_metrics():
    """Returns HUD analytics: Jobs Found, New Jobs, Profile Matches, JD Matches, Top Match %, Remote Jobs."""
    return {"status": "success", "metrics": job_repository.get_job_metrics()}

@router.get("/api/v2/jobs")
def list_jobs(
    status: Optional[str] = Query(None, description="Filter by status e.g. QUALIFIED, REJECTED, MANUAL_REQUIRED, APPROVED"),
    source: Optional[str] = Query(None, description="Filter by source e.g. linkedin, greenhouse, lever, workday"),
    match_type: Optional[str] = Query(None, description="Filter by match type: PROFILE_MATCH, JD_MATCH"),
    min_score: Optional[float] = Query(None, description="Minimum match score threshold"),
    limit: int = Query(50, ge=1, le=200)
):
    jobs = job_repository.list_jobs(
        status=status,
        source=source,
        match_type=match_type,
        min_score=min_score,
        limit=limit
    )
    return {"status": "success", "count": len(jobs), "jobs": jobs}

@router.get("/api/v2/jobs/{job_id}")
def get_job_details(job_id: str):
    job = job_repository.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    score = job_repository.get_job_score(job_id)
    return {
        "status": "success",
        "job": job,
        "score_details": score
    }

@router.post("/api/v2/jobs/{job_id}/score")
async def rescore_job(job_id: str):
    job = job_repository.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    score = await job_scoring_service.score_job(job)
    score["job_id"] = job_id
    saved_score = job_repository.save_job_score(score)
    return {"status": "success", "job_id": job_id, "score": saved_score}

@router.post("/api/v2/jobs/{job_id}/status")
def update_job_status(job_id: str, req: StatusUpdateRequest):
    allowed_statuses = {
        "DISCOVERED", "SCORING", "QUALIFIED", "REJECTED", "TAILORING",
        "READY_FOR_REVIEW", "APPROVED", "APPLYING", "APPLIED", "MANUAL_REQUIRED", "FAILED", "CLOSED"
    }
    if req.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Status '{req.status}' is not valid.")
    
    updated = job_repository.update_job_status(job_id, req.status)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return {"status": "success", "job": updated}

@router.post("/api/v2/jobs/bulk-delete")
def bulk_delete_jobs(payload: Dict[str, List[str]] = Body(...)):
    ids = payload.get("ids", [])
    if len(ids) > 500:
        raise HTTPException(status_code=400, detail="Bulk delete batch size exceeds limit of 500 IDs.")
    deleted_count = job_repository.delete_bulk(ids, actor="admin_user", action="MANUAL_DELETE")
    return {"status": "success", "pipeline": "jobs", "requested_count": len(ids), "deleted_count": deleted_count}

@router.delete("/api/v2/jobs/{job_id}")
def delete_job(job_id: str):
    deleted = job_repository.delete_by_id(job_id, actor="admin_user", action="MANUAL_DELETE")
    return {"status": "success", "message": f"Job {job_id} hard-deleted.", "deleted": deleted}
