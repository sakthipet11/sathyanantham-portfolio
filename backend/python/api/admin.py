import os
import secrets
import hashlib
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Header, Depends, Query, Request
from backend.python.models.pydantic_models import (
    AdminLoginRequest, CmsUpsertRequest, CmsDeleteRequest, PresenceToggleRequest,
    UserProfileUpdate, AutomationSettingsUpdate, AuditLogEntry
)
from backend.python.repositories.supabase_repo import db_helper
from backend.python.services.websocket_service import ws_manager

router = APIRouter(prefix="/api/admin", tags=["admin"])

def get_admin_password() -> str:
    raw = os.getenv("ADMIN_PASSWORD") or os.getenv("NEXT_PUBLIC_ADMIN_PASSWORD") or "sathya123"
    return raw.strip().strip("'\"")

def generate_admin_token(password: str) -> str:
    return hashlib.sha256(f"sathya_salt_{password}".encode()).hexdigest()

def verify_admin_token(x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token")):
    admin_pw = get_admin_password()
    expected_token = generate_admin_token(admin_pw)
    legacy_token = generate_admin_token("sathya_admin_passkey_2026")
    default_token = generate_admin_token("sathya123")
    
    valid_tokens = [expected_token, legacy_token, default_token]
    
    if not x_admin_token or not any(secrets.compare_digest(x_admin_token, t) for t in valid_tokens):
        raise HTTPException(status_code=401, detail="Unauthorized admin access")
    return True

@router.post("/login")
def admin_login(req: AdminLoginRequest):
    admin_pw = get_admin_password()
    submitted = (req.password or "").strip().strip("'\"")
    
    if submitted == admin_pw or submitted in {"sathya123", "sathya_admin_passkey_2026"}:
        token = generate_admin_token(admin_pw)
        return {"status": "success", "token": token}
    raise HTTPException(status_code=401, detail="Incorrect password credentials")

# ============================================================================
# Phase 1: Candidate Truth Store & Settings Endpoints
# ============================================================================
@router.get("/profile", dependencies=[Depends(verify_admin_token)])
def get_candidate_profile():
    profile = db_helper.get_user_profile()
    return {"status": "success", "profile": profile}

@router.put("/profile", dependencies=[Depends(verify_admin_token)])
def update_candidate_profile(req: UserProfileUpdate, request: Request):
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    before = db_helper.get_user_profile()
    res = db_helper.update_user_profile(update_data)
    
    # Audit log entry
    db_helper.insert_audit_log(
        actor_type="ADMIN_HUMAN",
        actor_id="sathyanantham_admin",
        action="UPDATE_USER_PROFILE",
        entity_type="user_profile",
        entity_id=before.get("id", "00000000-0000-0000-0000-000000000001"),
        before_state=before,
        after_state=res.get("data", {}),
        justification="Admin manual profile verification update",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    return res

@router.get("/settings", dependencies=[Depends(verify_admin_token)])
def get_automation_settings():
    settings = db_helper.get_automation_settings()
    return {"status": "success", "settings": settings}

@router.put("/settings", dependencies=[Depends(verify_admin_token)])
def update_automation_settings(req: AutomationSettingsUpdate, request: Request):
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    before = db_helper.get_automation_settings()
    res = db_helper.update_automation_settings(update_data)
    
    # Audit log entry
    db_helper.insert_audit_log(
        actor_type="ADMIN_HUMAN",
        actor_id="sathyanantham_admin",
        action="UPDATE_AUTOMATION_SETTINGS",
        entity_type="automation_settings",
        entity_id=before.get("id", "00000000-0000-0000-0000-000000000002"),
        before_state=before,
        after_state=res.get("data", {}),
        justification="Admin updated thresholds and automation constraints",
        ip_address=request.client.host if request.client else "127.0.0.1"
    )
    return res

@router.get("/audit-logs", dependencies=[Depends(verify_admin_token)])
def get_audit_logs(limit: int = Query(50, ge=1, le=200)):
    logs = db_helper.get_audit_logs(limit=limit)
    return {"status": "success", "count": len(logs), "logs": logs}

# ============================================================================
# Existing Portfolio Analytics, Contacts, CMS & Chat Management
# ============================================================================
@router.get("/analytics", dependencies=[Depends(verify_admin_token)])
def get_admin_analytics():
    return db_helper.get_analytics_summary()

@router.get("/contacts", dependencies=[Depends(verify_admin_token)])
def get_admin_contacts():
    return db_helper.get_contacts()

@router.get("/chat/sessions", dependencies=[Depends(verify_admin_token)])
def get_admin_chat_sessions():
    return db_helper.get_chat_sessions()

@router.delete("/chat/sessions", dependencies=[Depends(verify_admin_token)])
def delete_admin_chat_session(session_id: Optional[str] = Query(None, description="ID of the chat session to delete")):
    return db_helper.delete_chat_session(session_id)

@router.get("/chat/messages", dependencies=[Depends(verify_admin_token)])
def get_admin_chat_messages(session_id: str = Query(..., description="ID of the chat session")):
    return db_helper.get_chat_messages(session_id)

ALLOWED_CMS_TABLES = {"skills", "experience", "projects", "education", "certificates"}

@router.post("/cms/upsert", dependencies=[Depends(verify_admin_token)])
def upsert_cms_item(req: CmsUpsertRequest):
    if req.table_name not in ALLOWED_CMS_TABLES:
        raise HTTPException(status_code=400, detail=f"Table name '{req.table_name}' is not allowed.")
    return db_helper.upsert_portfolio_item(req.table_name, req.item)

@router.post("/cms/delete", dependencies=[Depends(verify_admin_token)])
def delete_cms_item(req: CmsDeleteRequest):
    if req.table_name not in ALLOWED_CMS_TABLES:
        raise HTTPException(status_code=400, detail=f"Table name '{req.table_name}' is not allowed.")
    return db_helper.delete_portfolio_item(req.table_name, req.item_id)

@router.post("/presence", dependencies=[Depends(verify_admin_token)])
async def toggle_admin_presence(req: PresenceToggleRequest):
    ws_manager.is_sathyanantham_online = req.is_online
    await ws_manager.broadcast_presence_to_visitors(req.is_online)
    return {
        "status": "success",
        "is_online": ws_manager.is_sathyanantham_online,
        "message": f"Sathyanantham V presence updated to {'Online' if req.is_online else 'Offline'}"
    }

# ============================================================================
# Google Drive Excel -> Database Sync Job Endpoints
# ============================================================================
@router.post("/gdrive-sync/run")
def trigger_gdrive_sync_run_now(date_str: Optional[str] = Query(None, description="Optional target date YYYY-MM-DD")):
    """Run Now button trigger for instant Google Drive Excel ingestion."""
    from backend.python.services.gdrive_sync_service import gdrive_sync_service
    res = gdrive_sync_service.run_sync(date_str=date_str, triggered_by="MANUAL_RUN_NOW_UI")
    return res

@router.get("/gdrive-sync/status")
def get_gdrive_sync_status():
    """Gets Google Drive Sync HUD status and last run metrics."""
    settings = db_helper.get_automation_settings()
    from datetime import datetime
    today_file = f"job_tracker_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
    return {
        "status": "success",
        "enabled": settings.get("gdrive_sync_enabled", True),
        "schedule_time": settings.get("gdrive_sync_schedule_time", "07:00 AM IST"),
        "frequency": settings.get("gdrive_sync_frequency", "DAILY"),
        "last_run": settings.get("gdrive_sync_last_run"),
        "last_status": settings.get("gdrive_sync_last_status", "IDLE"),
        "last_file": settings.get("gdrive_sync_last_file", today_file),
        "last_jobs_count": settings.get("gdrive_sync_last_jobs_count", 0)
    }

