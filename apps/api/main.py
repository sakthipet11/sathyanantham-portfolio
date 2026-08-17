import os
import json
import asyncio
import secrets
import hashlib
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.rag.ingestion import kb
from app.ai.providers import OpenRouterAIProvider
from app.ai.tools import execute_tool_call
from app.chat.websocket import ws_manager
from app.database.supabase_client import db_helper
from app.services.notifications import notify_admin_contact, notify_resume_download, notify_handoff_requested

app = FastAPI(
    title="Sathyanantham V AI Digital Twin API",
    description="FastAPI Backend for RAG Ingestion, OpenRouter AI streaming, database actions, and live visitor handoff.",
    version="1.0.0"
)

# Enable CORS for the frontend port (development and production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None
    session_id: Optional[str] = "session-default"

class ContactFormRequest(BaseModel):
    name: str
    email: str
    message: str
    company: Optional[str] = ""
    budget: Optional[str] = ""
    purpose: Optional[str] = ""

class EventRequest(BaseModel):
    session_id: str
    event_type: str
    details: Optional[Dict[str, Any]] = None
    country: Optional[str] = None
    city: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None

class AdminLoginRequest(BaseModel):
    password: str

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", os.getenv("NEXT_PUBLIC_ADMIN_PASSWORD", "sathya_admin_passkey_2026"))

def generate_admin_token(password: str) -> str:
    return hashlib.sha256(f"sathya_salt_{password}".encode()).hexdigest()

def verify_admin_token(x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token")):
    expected_token = generate_admin_token(ADMIN_PASSWORD)
    if not x_admin_token or not secrets.compare_digest(x_admin_token, expected_token):
        raise HTTPException(status_code=401, detail="Unauthorized admin access")
    return True

@app.post("/api/admin/login")
def admin_login(req: AdminLoginRequest):
    if req.password == ADMIN_PASSWORD:
        token = generate_admin_token(ADMIN_PASSWORD)
        return {"status": "success", "token": token}
    raise HTTPException(status_code=401, detail="Incorrect password credentials")

@app.get("/")
def read_root():
    return {
        "name": "Sathyanantham V AI Digital Twin API",
        "status": "online",
        "model_configured": os.getenv("OPENROUTER_API_MODEL", "anthropic/claude-3.5-sonnet"),
        "sathyanantham_online": ws_manager.is_sathyanantham_online,
        "database_connected": db_helper.is_configured()
    }

@app.get("/api/presence")
def get_presence():
    return {
        "is_online": ws_manager.is_sathyanantham_online,
        "status": "Sathyanantham V is Online" if ws_manager.is_sathyanantham_online else "AI Digital Twin Active"
    }

@app.post("/api/contact")
async def submit_contact(req: ContactFormRequest):
    # Save to Supabase
    res = db_helper.insert_contact(
        name=req.name,
        email=req.email,
        message=req.message,
        company=req.company,
        budget=req.budget,
        purpose=req.purpose
    )
    
    # Notify Admin instantly
    await notify_admin_contact(
        name=req.name,
        email=req.email,
        message=req.message,
        company=req.company,
        budget=req.budget,
        purpose=req.purpose
    )
    
    return res

@app.post("/api/visitor/event")
async def record_event(req: EventRequest):
    # Log to Supabase
    res = db_helper.insert_visitor_event(
        session_id=req.session_id,
        event_type=req.event_type,
        details=req.details,
        country=req.country,
        city=req.city,
        browser=req.browser,
        os_name=req.os
    )
    
    # Dispatch notifications on key actions
    if req.event_type == "resume_download":
        geo = f"{req.city or 'Unknown'}, {req.country or 'Unknown'}"
        await notify_resume_download(req.session_id, geo)
        
    return res

@app.get("/api/knowledge/search")
def search_knowledge(q: str = Query(..., description="Query query string")):
    results = kb.retrieve_context(q, top_k=5)
    return {"query": q, "results": results}

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    provider = OpenRouterAIProvider(model=req.model)
    messages_payload = [{"role": m.role, "content": m.content} for m in req.messages]
    
    # Save user message to database
    if req.messages:
        last_msg = req.messages[-1]
        if last_msg.role == "user":
            db_helper.insert_chat_message(req.session_id, "user", last_msg.content)

    async def event_generator():
        full_reply = ""
        async for chunk in provider.chat_completion(messages_payload, stream=True):
            full_reply += chunk
            data_str = json.dumps({"content": chunk})
            yield f"data: {data_str}\n\n"
        
        # Save assistant message to database
        if full_reply:
            db_helper.insert_chat_message(req.session_id, "assistant", full_reply)
            
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str = "visitor", role: str = "visitor"):
    if role == "host":
        await ws_manager.connect_sathyanantham(websocket)
        try:
            while True:
                data = await websocket.receive_json()
                
                # Broadcast host response to target visitor
                target_session = data.get("target_session_id")
                content = data.get("content", "")
                
                if target_session and content:
                    # Save host message to database
                    db_helper.insert_chat_message(target_session, "assistant", f"[Live] {content}")
                    
                    await ws_manager.send_to_visitor(target_session, {
                        "type": "human_response",
                        "sender": "Sathyanantham V (Live)",
                        "content": content
                    })
        except WebSocketDisconnect:
            ws_manager.disconnect_sathyanantham(websocket)
    else:
        # Load geographic/browser info from connection headers or query params if passed
        visitor_info = {}
        await ws_manager.connect_visitor(session_id, websocket, visitor_info)
        
        # Log session initiation in database
        db_helper.insert_chat_message(session_id, "system", "Visitor initiated chat session.")
        
        try:
            while True:
                data = await websocket.receive_json()
                msg_type = data.get("type", "chat")
                
                if msg_type == "request_handoff":
                    reason = data.get("notes", "Visitor requested live handoff")
                    
                    # Notify admin via Push Notification / Email
                    await notify_handoff_requested(session_id, reason)
                    
                    # Broadcast alert to all active host sessions
                    await ws_manager.broadcast_to_sathyanantham({
                        "type": "handoff_alert",
                        "session_id": session_id,
                        "notes": reason
                    })
                    
                    # Let the visitor know the host is being paged
                    await websocket.send_json({
                        "type": "system",
                        "content": "Paging Sathyanantham... If he is currently active, he will take over this chat shortly."
                    })

                elif msg_type == "user_message":
                    user_text = data.get("content", "")
                    if not user_text:
                        continue
                    
                    # Save user message to database
                    db_helper.insert_chat_message(session_id, "user", user_text)

                    # Forward to host if online
                    if ws_manager.is_sathyanantham_online:
                        await ws_manager.broadcast_to_sathyanantham({
                            "type": "visitor_message",
                            "session_id": session_id,
                            "content": user_text
                        })
                    else:
                        # Otherwise stream AI response
                        provider = OpenRouterAIProvider()
                        history = data.get("history", [{"role": "user", "content": user_text}])
                        
                        full_reply = ""
                        async for chunk in provider.chat_completion(history, stream=True):
                            full_reply += chunk
                            await websocket.send_json({
                                "type": "ai_stream_chunk",
                                "chunk": chunk
                            })
                        
                        # Save AI assistant message to database
                        db_helper.insert_chat_message(session_id, "assistant", full_reply)

                        await websocket.send_json({
                            "type": "ai_stream_end",
                            "full_reply": full_reply
                        })

        except WebSocketDisconnect:
            ws_manager.disconnect_visitor(session_id)

class CmsUpsertRequest(BaseModel):
    table_name: str
    item: Dict[str, Any]

class CmsDeleteRequest(BaseModel):
    table_name: str
    item_id: int

class PresenceToggleRequest(BaseModel):
    is_online: bool

ALLOWED_CMS_TABLES = {"skills", "experience", "projects", "education", "certificates"}

@app.get("/api/admin/analytics", dependencies=[Depends(verify_admin_token)])
def get_admin_analytics():
    return db_helper.get_analytics_summary()

@app.get("/api/admin/contacts", dependencies=[Depends(verify_admin_token)])
def get_admin_contacts():
    return db_helper.get_contacts()

@app.get("/api/admin/chat/sessions", dependencies=[Depends(verify_admin_token)])
def get_admin_chat_sessions():
    return db_helper.get_chat_sessions()

@app.delete("/api/admin/chat/sessions", dependencies=[Depends(verify_admin_token)])
def delete_admin_chat_session(session_id: Optional[str] = Query(None, description="ID of the chat session to delete")):
    return db_helper.delete_chat_session(session_id)

@app.get("/api/admin/chat/messages", dependencies=[Depends(verify_admin_token)])
def get_admin_chat_messages(session_id: str = Query(..., description="ID of the chat session")):
    return db_helper.get_chat_messages(session_id)

@app.post("/api/admin/cms/upsert", dependencies=[Depends(verify_admin_token)])
def upsert_cms_item(req: CmsUpsertRequest):
    if req.table_name not in ALLOWED_CMS_TABLES:
        raise HTTPException(status_code=400, detail=f"Table name '{req.table_name}' is not in allowed CMS tables list.")
    return db_helper.upsert_portfolio_item(req.table_name, req.item)

@app.post("/api/admin/cms/delete", dependencies=[Depends(verify_admin_token)])
def delete_cms_item(req: CmsDeleteRequest):
    if req.table_name not in ALLOWED_CMS_TABLES:
        raise HTTPException(status_code=400, detail=f"Table name '{req.table_name}' is not in allowed CMS tables list.")
    return db_helper.delete_portfolio_item(req.table_name, req.item_id)

@app.post("/api/admin/presence", dependencies=[Depends(verify_admin_token)])
async def toggle_admin_presence(req: PresenceToggleRequest):
    ws_manager.is_sathyanantham_online = req.is_online
    await ws_manager.broadcast_presence_to_visitors(req.is_online)
    return {
        "status": "success",
        "is_online": ws_manager.is_sathyanantham_online,
        "message": f"Sathyanantham V presence updated to {'Online' if req.is_online else 'Offline'}"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
