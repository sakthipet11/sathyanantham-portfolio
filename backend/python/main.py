import os
import sys
import json
import asyncio

# Ensure repository root and current package directory are in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.abspath(os.path.join(_current_dir, "..", ".."))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

try:
    from backend.python.api import admin, chat, contact, jobs, jobs_v2, applications, recruiter_inbox, referrals, control_center, hardening, copilot, portfolio, data_lifecycle, resumes
    from backend.python.services.websocket_service import ws_manager
    from backend.python.repositories.supabase_repo import db_helper
    from backend.python.services.notifications import notify_handoff_requested
    from backend.python.services.ai_providers import GenericLLMProvider, llm_provider
    from backend.python.services.rag_service import kb
except ModuleNotFoundError:
    from api import admin, chat, contact, jobs, jobs_v2, applications, recruiter_inbox, referrals, control_center, hardening, copilot, portfolio, data_lifecycle, resumes
    from services.websocket_service import ws_manager
    from repositories.supabase_repo import db_helper
    from services.notifications import notify_handoff_requested
    from services.ai_providers import GenericLLMProvider, llm_provider
    from services.rag_service import kb

app = FastAPI(
    title="Sathyanantham V Enterprise AI Twin & Multi-Agent API",
    description="FastAPI Backend for Multi-Agent Workflows, MCP Integration, RAG Ingestion, centralized generic LLM streaming, and live visitor handoff.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data_lifecycle.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(contact.router)
app.include_router(jobs.router)
app.include_router(jobs_v2.router)
app.include_router(applications.router)
app.include_router(recruiter_inbox.router)
app.include_router(referrals.router)
app.include_router(control_center.router)
app.include_router(hardening.router)
app.include_router(copilot.router)
app.include_router(portfolio.router)
app.include_router(resumes.router)

@app.get("/")
def read_root():
    return {
        "name": "Sathyanantham V Enterprise AI Twin & Multi-Agent API",
        "status": "online",
        "model_configured": llm_provider.model,
        "llm_base_url": llm_provider.base_url,
        "sathyanantham_online": ws_manager.is_sathyanantham_online,
        "database_connected": db_helper.is_configured(),
        "active_agents": [
            "job_discovery_agent",
            "job_scoring_agent",
            "resume_agent",
            "application_agent",
            "email_agent",
            "referral_agent"
        ],
        "mcp_servers": [
            "browserbase",
            "google_drive",
            "gmail",
            "postgres"
        ]
    }

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str = "visitor", role: str = "visitor"):
    if role == "host":
        await ws_manager.connect_sathyanantham(websocket)
        try:
            while True:
                data = await websocket.receive_json()
                target_session = data.get("target_session_id")
                content = data.get("content", "")
                
                if target_session and content:
                    db_helper.insert_chat_message(target_session, "assistant", f"[Live] {content}")
                    await ws_manager.send_to_visitor(target_session, {
                        "type": "human_response",
                        "sender": "Sathyanantham V (Live)",
                        "content": content
                    })
                    await ws_manager.broadcast_sessions_update()
        except WebSocketDisconnect:
            ws_manager.disconnect_sathyanantham(websocket)
    else:
        visitor_info = {}
        await ws_manager.connect_visitor(session_id, websocket, visitor_info)
        db_helper.insert_chat_message(session_id, "system", "Visitor initiated chat session.")
        await ws_manager.broadcast_sessions_update()
        
        try:
            while True:
                data = await websocket.receive_json()
                msg_type = data.get("type", "chat")
                
                if msg_type == "request_handoff":
                    reason = data.get("notes", "Visitor requested live handoff")
                    db_helper.upsert_chat_session(session_id, status="live_human")
                    await notify_handoff_requested(session_id, reason)
                    await ws_manager.broadcast_to_sathyanantham({
                        "type": "handoff_alert",
                        "session_id": session_id,
                        "notes": reason
                    })
                    await ws_manager.broadcast_sessions_update()
                    await websocket.send_json({
                        "type": "system",
                        "content": "Paging Sathyanantham... If he is currently active, he will take over this chat shortly."
                    })

                elif msg_type == "user_message":
                    user_text = data.get("content", "")
                    if not user_text:
                        continue
                    
                    db_helper.insert_chat_message(session_id, "user", user_text)

                    await ws_manager.broadcast_to_sathyanantham({
                        "type": "visitor_message",
                        "session_id": session_id,
                        "content": user_text
                    })
                    await ws_manager.broadcast_sessions_update()

                    if not ws_manager.is_sathyanantham_online:
                        provider = llm_provider
                        history = data.get("history", [{"role": "user", "content": user_text}])
                        system_prompt = kb.build_system_prompt(user_text)
                        full_payload = [{"role": "system", "content": system_prompt}] + history
                        
                        full_reply = ""
                        async for chunk in provider.chat_completion(full_payload, stream=True):
                            full_reply += chunk
                            await websocket.send_json({
                                "type": "ai_stream_chunk",
                                "chunk": chunk
                            })
                        
                        db_helper.insert_chat_message(session_id, "assistant", full_reply)

                        await websocket.send_json({
                            "type": "ai_stream_end",
                            "full_reply": full_reply
                        })
                        await ws_manager.broadcast_sessions_update()

        except WebSocketDisconnect:
            ws_manager.disconnect_visitor(session_id)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
