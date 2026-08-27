import os
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Header, Query, Request, Body, status
from pydantic import BaseModel, Field

from backend.python.repositories.retention_repository import retention_repository, VALID_PIPELINES
from backend.python.services.retention_service import retention_service
from backend.python.repositories.job_repository import job_repository
from backend.python.repositories.application_repository import application_repository
from backend.python.repositories.resume_repository import resume_repository
from backend.python.repositories.referral_repository import referral_repository
from backend.python.repositories.email_repository import email_repository

router = APIRouter(prefix="/api/v2", tags=["Data Lifecycle & Retention Purge"])

SERVICE_TOKEN = os.getenv("RETENTION_SERVICE_TOKEN", "sched-secret-token-2026")
MAX_BULK_DELETE_BATCH = 500

from backend.python.repositories.application_v2_repository import application_v2_repository

class BulkDeletePayload(BaseModel):
    ids: Optional[List[str]] = None
    application_ids: Optional[List[str]] = None

class PolicyUpdatePayload(BaseModel):
    enabled: bool = False
    retention_days: int = Field(10, ge=1, le=365)
    status_filter: Optional[List[str]] = None

class PreviewPayload(BaseModel):
    retention_days: int = Field(10, ge=1, le=365)
    status_filter: Optional[List[str]] = None

def get_repository_by_pipeline(pipeline: str):
    if pipeline == "jobs":
        return job_repository
    elif pipeline == "applications":
        return application_repository
    elif pipeline == "resumes":
        return resume_repository
    elif pipeline == "referrals":
        return referral_repository
    elif pipeline in ["emails", "recruiter-inbox"]:
        return email_repository
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pipeline '{pipeline}'. Must be one of: {list(VALID_PIPELINES)} or recruiter-inbox"
        )

# 1. Bulk Hard Delete (Max 500 IDs cap) - Placed BEFORE parameterized item_id to avoid route collision
@router.post("/{pipeline}/bulk-delete")
def bulk_delete_items(
    pipeline: str,
    payload: Dict[str, Any] = Body(default_factory=dict),
    x_admin_token: Optional[str] = Header(None)
):
    raw_ids = payload.get("ids") or payload.get("application_ids") or []
    if isinstance(raw_ids, str):
        raw_ids = [raw_ids]
    ids = [str(x) for x in raw_ids if x]
    
    if len(ids) > MAX_BULK_DELETE_BATCH:
        raise HTTPException(
            status_code=400,
            detail=f"Bulk delete batch size exceeds limit of {MAX_BULK_DELETE_BATCH} IDs. Received {len(ids)}."
        )

    if pipeline == "applications":
        del_v2 = application_v2_repository.bulk_delete_applications(ids)
        del_v1 = application_repository.delete_bulk(ids, actor="admin_user", action="MANUAL_DELETE")
        return {
            "status": "success",
            "pipeline": pipeline,
            "requested_count": len(ids),
            "deleted_count": del_v2 or del_v1
        }

    repo = get_repository_by_pipeline(pipeline)
    deleted_count = repo.delete_bulk(ids, actor="admin_user", action="MANUAL_DELETE")
    return {
        "status": "success",
        "pipeline": pipeline,
        "requested_count": len(ids),
        "deleted_count": deleted_count
    }

# 2. Single Hard Delete
@router.delete("/{pipeline}/{item_id}")
def delete_single_item(
    pipeline: str,
    item_id: str,
    x_admin_token: Optional[str] = Header(None)
):
    if pipeline == "applications":
        del_v2 = application_v2_repository.delete_application(item_id)
        if not del_v2:
            del_v1 = application_repository.delete_by_id(item_id, actor="admin_user", action="MANUAL_DELETE")
        return {"status": "success", "message": f"Item '{item_id}' hard-deleted from '{pipeline}'.", "deleted": True}

    repo = get_repository_by_pipeline(pipeline)
    deleted = repo.delete_by_id(item_id, actor="admin_user", action="MANUAL_DELETE")
    if not deleted:
        return {"status": "success", "message": f"Item '{item_id}' not found or already deleted from '{pipeline}'.", "deleted": False}
    
    return {"status": "success", "message": f"Item '{item_id}' hard-deleted from '{pipeline}'.", "deleted": True}

# 3. Retention Policies List
@router.get("/automation/retention-policies")
def get_retention_policies():
    policies = retention_repository.get_all_policies()
    return {"status": "success", "policies": policies}

# 4. Retention Policy Update
@router.put("/automation/retention-policies/{pipeline}")
def update_retention_policy(pipeline: str, payload: PolicyUpdatePayload):
    if pipeline not in VALID_PIPELINES:
        raise HTTPException(status_code=400, detail=f"Invalid pipeline enum '{pipeline}'")
    
    updated = retention_repository.update_policy(
        pipeline=pipeline,
        enabled=payload.enabled,
        retention_days=payload.retention_days,
        status_filter=payload.status_filter,
        updated_by="admin_user"
    )
    return {"status": "success", "policy": updated}

# 5. Retention Policy Preview (Count rows that WOULD be deleted)
@router.post("/automation/retention-policies/{pipeline}/preview")
def preview_retention_policy(pipeline: str, payload: PreviewPayload):
    if pipeline not in VALID_PIPELINES:
        raise HTTPException(status_code=400, detail=f"Invalid pipeline enum '{pipeline}'")

    preview = retention_service.preview_pipeline_purge(
        pipeline=pipeline,
        retention_days=payload.retention_days,
        status_filter=payload.status_filter
    )
    return {"status": "success", "preview": preview}

# 6. Retention Policy Pause
@router.post("/automation/retention-policies/{pipeline}/pause")
def pause_retention_policy(pipeline: str):
    if pipeline not in VALID_PIPELINES:
        raise HTTPException(status_code=400, detail=f"Invalid pipeline enum '{pipeline}'")
    
    updated = retention_repository.set_enabled(pipeline, False, updated_by="admin_user")
    return {"status": "success", "message": f"Retention policy for '{pipeline}' PAUSED.", "policy": updated}

# 7. Retention Policy Resume
@router.post("/automation/retention-policies/{pipeline}/resume")
def resume_retention_policy(pipeline: str):
    if pipeline not in VALID_PIPELINES:
        raise HTTPException(status_code=400, detail=f"Invalid pipeline enum '{pipeline}'")
    
    updated = retention_repository.set_enabled(pipeline, True, updated_by="admin_user")
    return {"status": "success", "message": f"Retention policy for '{pipeline}' RESUMED.", "policy": updated}

# 8. Run Now (Manual Trigger for single pipeline)
@router.post("/automation/retention-policies/{pipeline}/run-now")
def run_retention_now(pipeline: str):
    if pipeline not in VALID_PIPELINES:
        raise HTTPException(status_code=400, detail=f"Invalid pipeline enum '{pipeline}'")

    res = retention_service.run_pipeline_purge(pipeline, actor="admin_user", manual_override=True)
    if res.get("status") == "rejected":
        raise HTTPException(status_code=409, detail=res.get("message"))
    
    return {"status": "success", "result": res}

# 9. Scheduled Purge Endpoint (Cloud Scheduler only, Protected by Service Token)
@router.post("/automation/retention/run")
def trigger_scheduled_retention_run(
    x_service_token: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None)
):
    token = x_service_token or (authorization.replace("Bearer ", "") if authorization else None)
    if token != SERVICE_TOKEN and os.getenv("ENVIRONMENT") == "production":
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid service token for Cloud Scheduler retention endpoint."
        )

    res = retention_service.run_all_enabled_purges(actor="scheduler")
    return {"status": "success", "summary": res}
