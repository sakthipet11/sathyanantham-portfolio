import os
import secrets
import hashlib
from typing import Optional
from fastapi import APIRouter, HTTPException, Header, Depends, Query
from backend.python.models.pydantic_models import (
    AdminLoginRequest, CmsUpsertRequest, CmsDeleteRequest, PresenceToggleRequest
)
from backend.python.repositories.supabase_repo import db_helper
from backend.python.services.websocket_service import ws_manager

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", os.getenv("NEXT_PUBLIC_ADMIN_PASSWORD", "sathya_admin_passkey_2026"))

def generate_admin_token(password: str) -> str:
    return hashlib.sha256(f"sathya_salt_{password}".encode()).hexdigest()

def verify_admin_token(x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token")):
    expected_token = generate_admin_token(ADMIN_PASSWORD)
    if not x_admin_token or not secrets.compare_digest(x_admin_token, expected_token):
        raise HTTPException(status_code=401, detail="Unauthorized admin access")
    return True

@router.post("/login")
def admin_login(req: AdminLoginRequest):
    if req.password == ADMIN_PASSWORD:
        token = generate_admin_token(ADMIN_PASSWORD)
        return {"status": "success", "token": token}
    raise HTTPException(status_code=401, detail="Incorrect password credentials")

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
